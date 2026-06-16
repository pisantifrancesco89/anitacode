import { For } from "solid-js"
import type { AgentNode } from "./types"

const NODE_W = 180
const NODE_H = 60
const H_GAP = 60
const V_GAP = 40

export function AgentTreeView(props: { tree: AgentNode; onSelect: (name: string) => void }) {
  const layers = computeLayers(props.tree)
  const totalHeight = layers.reduce((max, layer) => Math.max(max, layer.length), 0) * (NODE_H + V_GAP) + V_GAP
  const totalWidth = layers.length * (NODE_W + H_GAP) + H_GAP

  return (
    <svg
      width="100%"
      height="100%"
      viewBox={`0 0 ${totalWidth} ${totalHeight}`}
      style={{ "max-height": "calc(100vh - 200px)" }}
    >
      <For each={layers}>
        {(layer, layerIdx) => {
          const x = layerIdx() * (NODE_W + H_GAP) + H_GAP / 2
          const startY = (totalHeight - (layer.length * (NODE_H + V_GAP) - V_GAP)) / 2

          return (
            <g>
              <For each={layer}>
                {(node, nodeIdx) => {
                  const y = startY + nodeIdx() * (NODE_H + V_GAP)

                  return (
                    <g>
                      <rect
                        id={`node-${node.name}`}
                        x={x}
                        y={y}
                        width={NODE_W}
                        height={NODE_H}
                        rx={8}
                        fill={node.color || "#6C5CE7"}
                        opacity={0.9}
                        style={{ cursor: "pointer" }}
                        onclick={() => props.onSelect(node.name)}
                      />
                      <text
                        x={x + NODE_W / 2}
                        y={y + 22}
                        text-anchor="middle"
                        fill="white"
                        font-size="13"
                        font-weight="bold"
                        style={{ "pointer-events": "none" }}
                      >
                        {node.name}
                      </text>
                      <text
                        x={x + NODE_W / 2}
                        y={y + 42}
                        text-anchor="middle"
                        fill="rgba(255,255,255,0.7)"
                        font-size="10"
                        style={{ "pointer-events": "none" }}
                      >
                        {node.mode}
                      </text>
                    </g>
                  )
                }}
              </For>
            </g>
          )
        }}
      </For>
      <For each={layers}>
        {(layer, layerIdx) => {
          if (layerIdx() === layers.length - 1) return null

          const x1 = layerIdx() * (NODE_W + H_GAP) + H_GAP / 2 + NODE_W
          const nextLayer = layers[layerIdx() + 1] || []
          const startY1 = (totalHeight - (layer.length * (NODE_H + V_GAP) - V_GAP)) / 2
          const startY2 = (totalHeight - (nextLayer.length * (NODE_H + V_GAP) - V_GAP)) / 2

          return (
            <g>
              <For each={layer}>
                {(node, nodeIdx) => {
                  const y1 = startY1 + nodeIdx() * (NODE_H + V_GAP) + NODE_H / 2

                  return (
                    <For each={node.children}>
                      {(child) => {
                        const childIdx = nextLayer.findIndex((n) => n.name === child.name)
                        const y2 = startY2 + childIdx * (NODE_H + V_GAP) + NODE_H / 2

                        return (
                          <line
                            x1={x1}
                            y1={y1}
                            x2={x1 + H_GAP}
                            y2={y2}
                            stroke={node.color || "#6C5CE7"}
                            stroke-width="2"
                            opacity={0.5}
                          />
                        )
                      }}
                    </For>
                  )
                }}
              </For>
            </g>
          )
        }}
      </For>
    </svg>
  )
}

function computeLayers(root: AgentNode): AgentNode[][] {
  const layers: AgentNode[][] = []
  const queue: Array<{ node: AgentNode; depth: number }> = [{ node: root, depth: 0 }]

  while (queue.length > 0) {
    const { node, depth } = queue.shift()!
    if (!layers[depth]) layers[depth] = []
    layers[depth].push(node)
    queue.push(...node.children.map((child) => ({ node: child, depth: depth + 1 })))
  }

  return layers
}
