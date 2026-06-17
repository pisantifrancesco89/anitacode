import { createSignal, createMemo, For, Show, onMount, onCleanup, type JSX } from "solid-js"
import { createStore, produce } from "solid-js/store"
import { makeEventListener } from "@solid-primitives/event-listener"
import type { AgentNode, AgentCanvasState, AgentPosition, AgentConnection, AgentTeam } from "./types"

const NODE_W = 180
const NODE_H = 60
const PORT_R = 6

type DragState = {
  type: "node" | "pan" | "connect"
  nodeId?: string
  startX: number
  startY: number
  offsetX?: number
  offsetY?: number
  fromAgent?: string
}

type ContextMenuState = {
  x: number
  y: number
  type: "canvas" | "node" | "connection" | "group"
  targetId?: string
}

export function AgentCanvas(props: {
  agents: AgentNode[]
  canvasState: AgentCanvasState
  onCanvasStateChange: (state: AgentCanvasState) => void
  onSelect: (name: string) => void
  onEdit: (name: string) => void
  onDelete: (name: string) => void
}): JSX.Element {
  let svgRef: SVGSVGElement | undefined
  let containerRef: HTMLDivElement | undefined

  // Viewport state
  const [zoom, setZoom] = createSignal(1)
  const [panX, setPanX] = createSignal(0)
  const [panY, setPanY] = createSignal(0)

  // Canvas data (from props, local copy for drag)
  const [store, setStore] = createStore<AgentCanvasState>({
    positions: [...props.canvasState.positions],
    connections: [...props.canvasState.connections],
    teams: [...props.canvasState.teams],
  })

  // Interaction state
  const [drag, setDrag] = createSignal<DragState | null>(null)
  const [selected, setSelected] = createSignal<string | null>(null)
  const [hoveredEdge, setHoveredEdge] = createSignal<string | null>(null)
  const [contextMenu, setContextMenu] = createSignal<ContextMenuState | null>(null)
  const [connectFrom, setConnectFrom] = createSignal<string | null>(null)

  // Initialize default positions for agents without positions
  const ensurePositions = () => {
    const existing = new Set(store.positions.map((p) => p.name))
    const missing = props.agents.filter((a) => !existing.has(a.name))
    if (missing.length === 0) return

    setStore(
      produce((draft) => {
        let offsetX = 100
        let offsetY = 100
        const maxY = draft.positions.reduce((max, p) => Math.max(max, p.y), 0) + NODE_H + 40

        for (const agent of missing) {
          // Try to find parent position
          const parent = draft.positions.find((p) =>
            props.agents.find((a) => a.name === p.name)?.children.some((c) => c.name === agent.name),
          )

          if (parent) {
            const siblingCount = props.agents.find((a) => a.name === parent.name)?.children.length ?? 1
            const idx = props.agents
              .find((a) => a.name === parent.name)
              ?.children.findIndex((c) => c.name === agent.name) ?? 0
            draft.positions.push({
              name: agent.name,
              x: parent.x + NODE_W + 80,
              y: parent.y + idx * (NODE_H + 30) - ((siblingCount - 1) * (NODE_H + 30)) / 2,
            })
          } else {
            draft.positions.push({
              name: agent.name,
              x: offsetX,
              y: maxY + offsetY,
            })
            offsetY += NODE_H + 40
          }
        }
      }),
    )
  }

  onMount(() => {
    ensurePositions()
  })

  // Sync props changes
  createMemo(() => {
    const state = props.canvasState
    setStore("positions", state.positions)
    setStore("connections", state.connections)
    setStore("teams", state.teams)
  })

  // Get position for an agent
  const getPosition = (name: string): { x: number; y: number } => {
    const pos = store.positions.find((p) => p.name === name)
    return pos ?? { x: 100, y: 100 }
  }

  // Screen to canvas coordinates
  const screenToCanvas = (sx: number, sy: number) => {
    const rect = containerRef?.getBoundingClientRect()
    if (!rect) return { x: sx, y: sy }
    return {
      x: (sx - rect.left - panX()) / zoom(),
      y: (sy - rect.top - panY()) / zoom(),
    }
  }

  // Emit state changes
  const emitChange = () => {
    props.onCanvasStateChange({
      positions: [...store.positions],
      connections: [...store.connections],
      teams: [...store.teams],
    })
  }

  // --- ZOOM ---
  const handleWheel = (e: WheelEvent) => {
    e.preventDefault()
    const delta = e.deltaY > 0 ? 0.9 : 1.1
    const newZoom = Math.min(3, Math.max(0.2, zoom() * delta))

    const rect = containerRef?.getBoundingClientRect()
    if (rect) {
      const mx = e.clientX - rect.left
      const my = e.clientY - rect.top
      setPanX(mx - (mx - panX()) * (newZoom / zoom()))
      setPanY(my - (my - panY()) * (newZoom / zoom()))
    }

    setZoom(newZoom)
  }

  const zoomIn = () => setZoom((z) => Math.min(3, z * 1.2))
  const zoomOut = () => setZoom((z) => Math.max(0.2, z / 1.2))
  const resetView = () => {
    setZoom(1)
    setPanX(0)
    setPanY(0)
  }

  // --- PAN ---
  const handleCanvasPointerDown = (e: PointerEvent) => {
    if (e.button === 2) return // right click handled separately
    if ((e.target as Element).closest("[data-node]")) return
    if ((e.target as Element).closest("[data-port]")) return

    setDrag({ type: "pan", startX: e.clientX - panX(), startY: e.clientY - panY() })
    setSelected(null)
    setContextMenu(null)
  }

  // --- NODE DRAG ---
  const handleNodePointerDown = (e: PointerEvent, name: string) => {
    if (e.button === 2) return
    e.stopPropagation()
    const pos = getPosition(name)
    setDrag({
      type: "node",
      nodeId: name,
      startX: e.clientX,
      startY: e.clientY,
      offsetX: pos.x,
      offsetY: pos.y,
    })
    setSelected(name)
    props.onSelect(name)
    setContextMenu(null)
  }

  // --- CONNECTION DRAWING ---
  const handlePortClick = (e: MouseEvent, agentName: string) => {
    e.stopPropagation()
    if (!connectFrom()) {
      setConnectFrom(agentName)
    } else if (connectFrom() !== agentName) {
      // Check for duplicate
      const exists = store.connections.some(
        (c) => c.from === connectFrom() && c.to === agentName,
      )
      if (!exists) {
        setStore(
          "connections",
          produce((draft) => {
            draft.push({
              id: `conn-${Date.now()}`,
              from: connectFrom()!,
              to: agentName,
            })
          }),
        )
        emitChange()
      }
      setConnectFrom(null)
    }
  }

  // --- POINTER MOVE ---
  const handlePointerMove = (e: PointerEvent) => {
    const d = drag()
    if (!d) return

    if (d.type === "pan") {
      setPanX(e.clientX - d.startX)
      setPanY(e.clientY - d.startY)
    } else if (d.type === "node" && d.nodeId) {
      const dx = (e.clientX - d.startX) / zoom()
      const dy = (e.clientY - d.startY) / zoom()
      const newX = Math.round(d.offsetX! + dx)
      const newY = Math.round(d.offsetY! + dy)
      setStore(
        "positions",
        (p) => p.name === d.nodeId,
        { x: newX, y: newY },
      )
    }
  }

  const handlePointerUp = () => {
    const d = drag()
    if (d && d.type === "node") {
      emitChange()
    }
    setDrag(null)
  }

  // --- CONTEXT MENU ---
  const handleContextMenu = (e: MouseEvent) => {
    e.preventDefault()
    const target = e.target as Element

    if (target.closest("[data-edge]")) {
      const edgeId = target.closest("[data-edge]")?.getAttribute("data-edge")
      setContextMenu({ x: e.clientX, y: e.clientY, type: "connection", targetId: edgeId ?? undefined })
    } else if (target.closest("[data-node]")) {
      const nodeName = target.closest("[data-node]")?.getAttribute("data-node")
      setContextMenu({ x: e.clientX, y: e.clientY, type: "node", targetId: nodeName ?? undefined })
    } else {
      setContextMenu({ x: e.clientX, y: e.clientY, type: "canvas" })
    }
  }

  // --- ACTIONS ---
  const addAgent = () => {
    setContextMenu(null)
    props.onSelect("__new__")
  }

  const deleteNode = (name: string) => {
    setStore(
      produce((draft) => {
        draft.positions = draft.positions.filter((p) => p.name !== name)
        draft.connections = draft.connections.filter((c) => c.from !== name && c.to !== name)
        draft.teams = draft.teams.map((t) => ({
          ...t,
          agentNames: t.agentNames.filter((n) => n !== name),
        }))
      }),
    )
    emitChange()
    setContextMenu(null)
    props.onDelete(name)
  }

  const deleteConnection = (id: string) => {
    setStore("connections", produce((draft) => {
      const idx = draft.findIndex((c) => c.id === id)
      if (idx !== -1) draft.splice(idx, 1)
    }))
    emitChange()
    setContextMenu(null)
  }

  const createTeam = () => {
    const newTeam: AgentTeam = {
      id: `team-${Date.now()}`,
      name: "New Team",
      agentNames: [],
      color: "#6C5CE7",
      x: panX() / zoom() + 50,
      y: panY() / zoom() + 50,
      width: 400,
      height: 300,
    }
    setStore("teams", produce((draft) => { draft.push(newTeam) }))
    emitChange()
    setContextMenu(null)
  }

  // Close context menu on outside click
  const handleClickOutside = () => setContextMenu(null)

  onMount(() => {
    const cleanup1 = makeEventListener(window, "pointermove", handlePointerMove)
    const cleanup2 = makeEventListener(window, "pointerup", handlePointerUp)
    const cleanup3 = makeEventListener(window, "click", handleClickOutside)
    onCleanup(() => { cleanup1(); cleanup2(); cleanup3() })
  })

  // Get all agent names
  const allAgentNames = createMemo(() => props.agents.map((a) => a.name))

  return (
    <div
      ref={containerRef}
      class="relative w-full h-full overflow-hidden bg-[#0a0a16] rounded-lg"
      style={{ cursor: drag()?.type === "pan" ? "grabbing" : "grab" }}
      onWheel={handleWheel}
      onPointerDown={handleCanvasPointerDown}
      onContextMenu={handleContextMenu}
    >
      {/* Zoom Toolbar */}
      <div class="absolute top-3 right-3 z-20 flex items-center gap-1 bg-[#1a1a2e] border border-[#333] rounded-lg p-1">
        <button onClick={zoomIn} class="size-8 flex items-center justify-center rounded hover:bg-[#333] text-white text-sm font-bold" title="Zoom in">+</button>
        <span class="px-2 text-xs text-[#999] min-w-[40px] text-center">{Math.round(zoom() * 100)}%</span>
        <button onClick={zoomOut} class="size-8 flex items-center justify-center rounded hover:bg-[#333] text-white text-sm font-bold" title="Zoom out">−</button>
        <div class="w-px h-5 bg-[#333]" />
        <button onClick={resetView} class="size-8 flex items-center justify-center rounded hover:bg-[#333] text-[#999] text-xs" title="Reset view">⌂</button>
      </div>

      {/* Connection mode indicator */}
      <Show when={connectFrom()}>
        <div class="absolute top-3 left-1/2 -translate-x-1/2 z-20 bg-[#6C5CE7] text-white text-xs px-3 py-1.5 rounded-full">
          Click on target agent to connect from "{connectFrom()}"
          <button onClick={() => setConnectFrom(null)} class="ml-2 hover:opacity-70">✕</button>
        </div>
      </Show>

      {/* Canvas */}
      <svg
        ref={svgRef}
        width="100%"
        height="100%"
        class="absolute inset-0"
        style={{ "pointer-events": "none" }}
      >
        <g transform={`translate(${panX()}, ${panY()}) scale(${zoom()})`} style={{ "pointer-events": "all" }}>
          {/* Grid pattern */}
          <defs>
            <pattern id="grid" width={40} height={40} patternUnits="userSpaceOnUse">
              <path d={`M 40 0 L 0 0 0 40`} fill="none" stroke="#1a1a2e" stroke-width="0.5" />
            </pattern>
          </defs>
          <rect x={-5000} y={-5000} width={10000} height={10000} fill="url(#grid)" />

          {/* Teams (behind nodes) */}
          <For each={store.teams}>
            {(team) => (
              <g>
                <rect
                  x={team.x}
                  y={team.y}
                  width={team.width}
                  height={team.height}
                  rx={12}
                  fill={team.color}
                  fill-opacity={0.08}
                  stroke={team.color}
                  stroke-width={1.5}
                  stroke-dasharray="8 4"
                  stroke-opacity={0.3}
                />
                <text
                  x={team.x + 12}
                  y={team.y + 20}
                  fill={team.color}
                  font-size="12"
                  font-weight="600"
                  opacity={0.7}
                >
                  {team.name}
                </text>
              </g>
            )}
          </For>

          {/* Connections */}
          <For each={store.connections}>
            {(conn) => {
              const from = getPosition(conn.from)
              const to = getPosition(conn.to)
              const x1 = from.x + NODE_W
              const y1 = from.y + NODE_H / 2
              const x2 = to.x
              const y2 = to.y + NODE_H / 2
              const dx = Math.abs(x2 - x1) * 0.5
              const isHovered = hoveredEdge() === conn.id

              return (
                <g
                  data-edge={conn.id}
                  style={{ cursor: "pointer", "pointer-events": "stroke" }}
                  onPointerEnter={() => setHoveredEdge(conn.id)}
                  onPointerLeave={() => setHoveredEdge(null)}
                >
                  {/* Invisible wide hit area */}
                  <path
                    d={`M ${x1} ${y1} C ${x1 + dx} ${y1}, ${x2 - dx} ${y2}, ${x2} ${y2}`}
                    fill="none"
                    stroke="transparent"
                    stroke-width={12}
                  />
                  {/* Visible path */}
                  <path
                    d={`M ${x1} ${y1} C ${x1 + dx} ${y1}, ${x2 - dx} ${y2}, ${x2} ${y2}`}
                    fill="none"
                    stroke={isHovered ? "#E17055" : "#6C5CE7"}
                    stroke-width={isHovered ? 3 : 2}
                    opacity={isHovered ? 1 : 0.6}
                  />
                  {/* Arrow head */}
                  <circle cx={x2} cy={y2} r={4} fill={isHovered ? "#E17055" : "#6C5CE7"} opacity={isHovered ? 1 : 0.6} />
                  {/* Delete button on hover */}
                  <Show when={isHovered}>
                    <g
                      data-edge={conn.id}
                      onClick={() => deleteConnection(conn.id)}
                      style={{ cursor: "pointer" }}
                    >
                      <circle cx={(x1 + x2) / 2} cy={(y1 + y2) / 2} r={10} fill="#E17055" />
                      <text
                        x={(x1 + x2) / 2}
                        y={(y1 + y2) / 2 + 4}
                        text-anchor="middle"
                        fill="white"
                        font-size="10"
                        font-weight="bold"
                        style={{ "pointer-events": "none" }}
                      >
                        ✕
                      </text>
                    </g>
                  </Show>
                </g>
              )
            }}
          </For>

          {/* Nodes */}
          <For each={props.agents}>
            {(agent) => {
              const pos = getPosition(agent.name)
              const isSelected = selected() === agent.name
              const isConnectTarget = connectFrom() !== null && connectFrom() !== agent.name

              return (
                <g
                  data-node={agent.name}
                  transform={`translate(${pos.x}, ${pos.y})`}
                  style={{ cursor: "pointer" }}
                  onPointerDown={(e) => handleNodePointerDown(e, agent.name)}
                >
                  {/* Node background */}
                  <rect
                    width={NODE_W}
                    height={NODE_H}
                    rx={8}
                    fill={agent.color || "#6C5CE7"}
                    opacity={0.9}
                    stroke={isSelected ? "#fff" : isConnectTarget ? "#FDCB6E" : "transparent"}
                    stroke-width={isSelected ? 2 : isConnectTarget ? 2 : 0}
                  />
                  {/* Glow effect on select */}
                  <Show when={isSelected}>
                    <rect
                      x={-4}
                      y={-4}
                      width={NODE_W + 8}
                      height={NODE_H + 8}
                      rx={12}
                      fill="none"
                      stroke={agent.color}
                      stroke-width={2}
                      opacity={0.4}
                    />
                  </Show>
                  {/* Agent name */}
                  <text
                    x={NODE_W / 2}
                    y={22}
                    text-anchor="middle"
                    fill="white"
                    font-size="13"
                    font-weight="bold"
                    style={{ "pointer-events": "none" }}
                  >
                    {agent.name}
                  </text>
                  {/* Mode badge */}
                  <text
                    x={NODE_W / 2}
                    y={42}
                    text-anchor="middle"
                    fill="rgba(255,255,255,0.7)"
                    font-size="10"
                    style={{ "pointer-events": "none" }}
                  >
                    {agent.mode}
                  </text>
                  {/* Input port (left) */}
                  <circle
                    data-port="in"
                    cx={0}
                    cy={NODE_H / 2}
                    r={PORT_R}
                    fill="#1a1a2e"
                    stroke={agent.color}
                    stroke-width={2}
                    style={{ cursor: "crosshair" }}
                    onClick={(e) => handlePortClick(e, agent.name)}
                  />
                  {/* Output port (right) */}
                  <circle
                    data-port="out"
                    cx={NODE_W}
                    cy={NODE_H / 2}
                    r={PORT_R}
                    fill={agent.color}
                    stroke="#fff"
                    stroke-width={2}
                    style={{ cursor: "crosshair" }}
                    onClick={(e) => handlePortClick(e, agent.name)}
                  />
                </g>
              )
            }}
          </For>
        </g>
      </svg>

      {/* Context Menu */}
      <Show when={contextMenu()}>
        {(menu) => {
          const m = menu()
          return (
            <div
              class="fixed z-50 bg-[#1a1a2e] border border-[#333] rounded-lg shadow-xl py-1 min-w-[160px]"
              style={{ left: `${m.x}px`, top: `${m.y}px` }}
              onClick={(e) => e.stopPropagation()}
            >
              <Show when={m.type === "canvas"}>
                <button onClick={addAgent} class="w-full px-3 py-2 text-left text-sm text-white hover:bg-[#333]">
                  + Add Agent
                </button>
                <button onClick={createTeam} class="w-full px-3 py-2 text-left text-sm text-white hover:bg-[#333]">
                  + Create Team
                </button>
              </Show>
              <Show when={m.type === "node" && m.targetId}>
                <button onClick={() => { props.onEdit(m.targetId!); setContextMenu(null) }} class="w-full px-3 py-2 text-left text-sm text-white hover:bg-[#333]">
                  Edit
                </button>
                <button onClick={() => { setConnectFrom(m.targetId!); setContextMenu(null) }} class="w-full px-3 py-2 text-left text-sm text-white hover:bg-[#333]">
                  Connect to...
                </button>
                <div class="border-t border-[#333] my-1" />
                <button onClick={() => deleteNode(m.targetId!)} class="w-full px-3 py-2 text-left text-sm text-[#E17055] hover:bg-[#333]">
                  Delete
                </button>
              </Show>
              <Show when={m.type === "connection" && m.targetId}>
                <button onClick={() => deleteConnection(m.targetId!)} class="w-full px-3 py-2 text-left text-sm text-[#E17055] hover:bg-[#333]">
                  Delete connection
                </button>
              </Show>
            </div>
          )
        }}
      </Show>
    </div>
  )
}
