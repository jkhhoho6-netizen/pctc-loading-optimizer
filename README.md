# PCTC Loading Optimizer

A portfolio project that simulates how vehicles should be assigned to the decks of a PCTC (Pure Car and Truck Carrier) to maximize deck space utilization under height-clearance and weight constraints.

## 1. Project Overview

This project is a web-based simulator that takes a list of vehicles (car type, dimensions, weight, quantity) and a PCTC's deck specifications (length, width, clear height, weight capacity), then computes a loading plan.

PCTC decks differ in clear height and weight capacity, so not every vehicle can be placed on every deck — a small hatchback can go almost anywhere, but a pickup truck or a small cargo truck needs a deck with enough clearance. The simulator:

- assigns vehicles to feasible decks under height and weight constraints
- packs each deck's floor space using a 2D shelf-based bin-packing algorithm (with rotation)
- reports how many vehicles could not be loaded due to space or weight limits
- visualizes each deck's actual layout as an SVG diagram

## 2. Why I Built This

I first learned what a PCTC even is while on exchange in Japan, watching a Korean-flagged car carrier dock at Yokohama port. Later, during a shipping/logistics job-training program, I toured Pyeongtaek port and watched finished vehicles being loaded up a RoRo ramp — and started wondering how loading planners actually decide which car goes on which deck.

This project reflects that curiosity, translated into an operations-research-style problem: multi-constrained 2D bin packing. Instead of another CRUD app, I wanted a portfolio piece that pairs a shipping-domain question with an actual algorithm, in the same spirit as my air cargo Break-Point Calculator project but on the ocean/RoRo side.

## 3. Core Features

- Editable deck specification table (length, width, clear height, weight capacity per deck)
- Editable vehicle list with quantities, plus support for adding custom vehicle types
- Height-clearance-aware, weight-capacity-aware deck assignment
- 2D shelf bin-packing with rotation, per deck
- Per-deck area/weight utilization and an SVG floor-plan diagram
- Explicit reporting of vehicles that could not be loaded, and why

## 4. Algorithm Notes

The assignment order processes taller vehicles first (fewer decks can host them), then larger-footprint vehicles first within the same height tier — a Best-Fit-Decreasing-style heuristic. Each vehicle is then packed into a deck's open space using a shelf algorithm: it tries the current shelf first, then opens a new shelf if there's room, trying both orientations (rotated 90°) to reduce wasted space.

This is a heuristic approximation, not an exact solver — 2D bin packing with multiple constraints is NP-hard. It also does not model ramp gradients, aisle/turning clearances, or lashing (tie-down) margins between vehicles, all of which matter in real PCTC operations. The default deck specifications are illustrative values referencing a 6,500 CEU-class PCTC, not any specific vessel's actual particulars.

## 5. Tech Stack

- Next.js 16
- TypeScript
- Tailwind CSS v4
- Vercel

## 6. Project Structure

```
app/
  page.tsx      # UI: deck/vehicle input tables, results, SVG deck diagrams
  layout.tsx
lib/
  pctc.ts       # types, packing algorithm, default deck/vehicle presets
public/
README.md
package.json
```

## 7. Local Development

```bash
npm install
npm run dev
```

## 프로젝트 한줄 소개

PCTC(자동차운반선)의 데크별 유효고·허용중량 제약 안에서, 선적할 차량 목록을 어떻게 배치해야 데크 공간을 최대한 활용할 수 있는지 2D bin-packing 알고리즘으로 계산하고 데크별 적재 도면을 시각화하는 시뮬레이터입니다.
