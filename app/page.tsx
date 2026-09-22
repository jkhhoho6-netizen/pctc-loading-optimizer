"use client";

import { useState } from "react";
import {
  DEFAULT_DECKS,
  DEFAULT_VEHICLE_TYPES,
  optimizeLoading,
  type Deck,
  type OptimizationResult,
  type VehicleType,
} from "@/lib/pctc";

const PALETTE = ["#60a5fa", "#34d399", "#f472b6", "#fbbf24", "#a78bfa", "#f87171", "#22d3ee"];

const DEFAULT_QUANTITIES: Record<string, number> = {
  "compact-sedan": 220,
  "midsize-sedan": 180,
  "compact-suv": 140,
  "large-suv": 90,
  pickup: 50,
  "small-truck": 20,
};

function formatPercent(x: number) {
  return `${(x * 100).toFixed(1)}%`;
}

function newVehicleId() {
  return `custom-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

export default function Home() {
  const [decks, setDecks] = useState<Deck[]>(DEFAULT_DECKS);
  const [vehicleTypes, setVehicleTypes] = useState<VehicleType[]>(DEFAULT_VEHICLE_TYPES);
  const [quantities, setQuantities] = useState<Record<string, number>>(DEFAULT_QUANTITIES);
  const [result, setResult] = useState<OptimizationResult | null>(null);

  function updateDeck(id: string, field: keyof Deck, value: number) {
    setDecks((prev) => prev.map((d) => (d.id === id ? { ...d, [field]: value } : d)));
  }

  function resetDecks() {
    setDecks(DEFAULT_DECKS);
  }

  function updateVehicleType(id: string, field: keyof VehicleType, value: string | number) {
    setVehicleTypes((prev) => prev.map((v) => (v.id === id ? { ...v, [field]: value } : v)));
  }

  function addVehicleType() {
    const id = newVehicleId();
    const color = PALETTE[vehicleTypes.length % PALETTE.length];
    setVehicleTypes((prev) => [
      ...prev,
      { id, name: "새 차종", length: 4.5, width: 1.8, height: 1.5, weight: 1.5, color },
    ]);
    setQuantities((prev) => ({ ...prev, [id]: 5 }));
  }

  function removeVehicleType(id: string) {
    setVehicleTypes((prev) => prev.filter((v) => v.id !== id));
    setQuantities((prev) => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
  }

  function updateQuantity(id: string, value: number) {
    setQuantities((prev) => ({ ...prev, [id]: value }));
  }

  function handleCompute() {
    const entries = vehicleTypes
      .map((v) => ({ vehicleTypeId: v.id, quantity: quantities[v.id] ?? 0 }))
      .filter((e) => e.quantity > 0);
    setResult(optimizeLoading(entries, vehicleTypes, decks));
  }

  const totalRequested = vehicleTypes.reduce((sum, v) => sum + (quantities[v.id] ?? 0), 0);

  return (
    <div className="flex-1 w-full max-w-5xl mx-auto px-6 py-10 flex flex-col gap-10">
      <header className="flex flex-col gap-2">
        <h1 className="text-2xl font-semibold">PCTC 적재 최적화 시뮬레이터</h1>
        <p className="text-sm text-black/60 dark:text-white/60">
          자동차운반선(PCTC)의 데크별 유효고·허용중량 제약 안에서, 선적할 차량 목록을 어떻게
          배치하면 데크 공간을 최대한 활용할 수 있는지 계산합니다. 2D shelf bin-packing
          휴리스틱을 사용한 근사 알고리즘입니다.
        </p>
      </header>

      <section className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-medium">1. 선박 데크 사양</h2>
          <button
            onClick={resetDecks}
            className="text-xs px-3 py-1.5 rounded border border-black/15 dark:border-white/20 hover:bg-black/5 dark:hover:bg-white/10"
          >
            기본값으로 초기화
          </button>
        </div>
        <p className="text-xs text-black/50 dark:text-white/50">
          6,500 CEU급 PCTC를 참고한 예시 사양입니다. 실제 선사·선형에 따라 데크 구성, 유효고,
          허용중량은 다릅니다. 값을 직접 수정해 다른 선형을 가정해볼 수 있습니다.
        </p>
        <div className="overflow-x-auto rounded border border-black/10 dark:border-white/15">
          <table className="w-full text-sm">
            <thead className="bg-black/5 dark:bg-white/10 text-left">
              <tr>
                <th className="px-3 py-2 font-medium">데크</th>
                <th className="px-3 py-2 font-medium">길이 (m)</th>
                <th className="px-3 py-2 font-medium">폭 (m)</th>
                <th className="px-3 py-2 font-medium">유효고 (m)</th>
                <th className="px-3 py-2 font-medium">허용중량 (ton)</th>
              </tr>
            </thead>
            <tbody>
              {decks.map((d) => (
                <tr key={d.id} className="border-t border-black/10 dark:border-white/10">
                  <td className="px-3 py-1.5 whitespace-nowrap">{d.name}</td>
                  <td className="px-3 py-1.5">
                    <input
                      type="number"
                      step={0.5}
                      value={d.length}
                      onChange={(e) => updateDeck(d.id, "length", Number(e.target.value))}
                      className="w-20 rounded border border-black/15 dark:border-white/20 bg-transparent px-2 py-1"
                    />
                  </td>
                  <td className="px-3 py-1.5">
                    <input
                      type="number"
                      step={0.5}
                      value={d.width}
                      onChange={(e) => updateDeck(d.id, "width", Number(e.target.value))}
                      className="w-20 rounded border border-black/15 dark:border-white/20 bg-transparent px-2 py-1"
                    />
                  </td>
                  <td className="px-3 py-1.5">
                    <input
                      type="number"
                      step={0.05}
                      value={d.clearHeight}
                      onChange={(e) => updateDeck(d.id, "clearHeight", Number(e.target.value))}
                      className="w-20 rounded border border-black/15 dark:border-white/20 bg-transparent px-2 py-1"
                    />
                  </td>
                  <td className="px-3 py-1.5">
                    <input
                      type="number"
                      step={10}
                      value={d.weightCapacity}
                      onChange={(e) => updateDeck(d.id, "weightCapacity", Number(e.target.value))}
                      className="w-24 rounded border border-black/15 dark:border-white/20 bg-transparent px-2 py-1"
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-medium">2. 선적 차량 목록</h2>
          <button
            onClick={addVehicleType}
            className="text-xs px-3 py-1.5 rounded border border-black/15 dark:border-white/20 hover:bg-black/5 dark:hover:bg-white/10"
          >
            + 커스텀 차종 추가
          </button>
        </div>
        <div className="overflow-x-auto rounded border border-black/10 dark:border-white/15">
          <table className="w-full text-sm">
            <thead className="bg-black/5 dark:bg-white/10 text-left">
              <tr>
                <th className="px-3 py-2 font-medium">색상</th>
                <th className="px-3 py-2 font-medium">차종</th>
                <th className="px-3 py-2 font-medium">전장(m)</th>
                <th className="px-3 py-2 font-medium">전폭(m)</th>
                <th className="px-3 py-2 font-medium">전고(m)</th>
                <th className="px-3 py-2 font-medium">중량(t)</th>
                <th className="px-3 py-2 font-medium">수량</th>
                <th className="px-3 py-2 font-medium"></th>
              </tr>
            </thead>
            <tbody>
              {vehicleTypes.map((v) => (
                <tr key={v.id} className="border-t border-black/10 dark:border-white/10">
                  <td className="px-3 py-1.5">
                    <input
                      type="color"
                      value={v.color}
                      onChange={(e) => updateVehicleType(v.id, "color", e.target.value)}
                      className="w-8 h-8 rounded border border-black/15 dark:border-white/20 bg-transparent"
                    />
                  </td>
                  <td className="px-3 py-1.5">
                    <input
                      type="text"
                      value={v.name}
                      onChange={(e) => updateVehicleType(v.id, "name", e.target.value)}
                      className="w-28 rounded border border-black/15 dark:border-white/20 bg-transparent px-2 py-1"
                    />
                  </td>
                  <td className="px-3 py-1.5">
                    <input
                      type="number"
                      step={0.1}
                      value={v.length}
                      onChange={(e) => updateVehicleType(v.id, "length", Number(e.target.value))}
                      className="w-16 rounded border border-black/15 dark:border-white/20 bg-transparent px-2 py-1"
                    />
                  </td>
                  <td className="px-3 py-1.5">
                    <input
                      type="number"
                      step={0.05}
                      value={v.width}
                      onChange={(e) => updateVehicleType(v.id, "width", Number(e.target.value))}
                      className="w-16 rounded border border-black/15 dark:border-white/20 bg-transparent px-2 py-1"
                    />
                  </td>
                  <td className="px-3 py-1.5">
                    <input
                      type="number"
                      step={0.05}
                      value={v.height}
                      onChange={(e) => updateVehicleType(v.id, "height", Number(e.target.value))}
                      className="w-16 rounded border border-black/15 dark:border-white/20 bg-transparent px-2 py-1"
                    />
                  </td>
                  <td className="px-3 py-1.5">
                    <input
                      type="number"
                      step={0.1}
                      value={v.weight}
                      onChange={(e) => updateVehicleType(v.id, "weight", Number(e.target.value))}
                      className="w-16 rounded border border-black/15 dark:border-white/20 bg-transparent px-2 py-1"
                    />
                  </td>
                  <td className="px-3 py-1.5">
                    <input
                      type="number"
                      min={0}
                      value={quantities[v.id] ?? 0}
                      onChange={(e) => updateQuantity(v.id, Number(e.target.value))}
                      className="w-16 rounded border border-black/15 dark:border-white/20 bg-transparent px-2 py-1"
                    />
                  </td>
                  <td className="px-3 py-1.5">
                    <button
                      onClick={() => removeVehicleType(v.id)}
                      className="text-xs text-black/40 dark:text-white/40 hover:text-red-500"
                    >
                      삭제
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="text-xs text-black/50 dark:text-white/50">
          총 신청 대수: {totalRequested}대
        </p>
      </section>

      <button
        onClick={handleCompute}
        className="self-start px-5 py-2.5 rounded bg-blue-600 text-white text-sm font-medium hover:bg-blue-700"
      >
        적재 계획 계산하기
      </button>

      {result && (
        <section className="flex flex-col gap-6">
          <h2 className="text-lg font-medium">3. 적재 계획 결과</h2>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <SummaryCard label="신청 대수" value={`${result.totalRequested}대`} />
            <SummaryCard label="적재 대수" value={`${result.loadedCount}대`} />
            <SummaryCard label="미적재 대수" value={`${result.unloadedCount}대`} highlight={result.unloadedCount > 0} />
            <SummaryCard label="전체 면적 활용률" value={formatPercent(result.overallAreaUtilization)} />
          </div>

          {result.unloadedByType.length > 0 && (
            <div className="rounded border border-amber-400/40 bg-amber-50 dark:bg-amber-950/30 px-4 py-3 text-sm">
              <p className="font-medium mb-1">공간·중량 제약으로 선적하지 못한 차량</p>
              <ul className="list-disc list-inside text-black/70 dark:text-white/70">
                {result.unloadedByType.map((u) => (
                  <li key={u.vehicleTypeId}>
                    {u.name} {u.count}대
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="grid sm:grid-cols-2 gap-6">
            {result.deckResults.map((dr) => {
              const scale = Math.min(8, 260 / Math.max(dr.deck.length, dr.deck.width));
              const svgW = dr.deck.length * scale;
              const svgH = dr.deck.width * scale;
              return (
                <div
                  key={dr.deck.id}
                  className="rounded border border-black/10 dark:border-white/15 p-3 flex flex-col gap-2"
                >
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium">{dr.deck.name}</span>
                    <span className="text-black/50 dark:text-white/50">{dr.loadedCount}대</span>
                  </div>
                  <div className="flex gap-4 text-xs text-black/60 dark:text-white/60">
                    <span>면적 {formatPercent(dr.areaUtilization)}</span>
                    <span>중량 {formatPercent(dr.weightUtilization)}</span>
                    <span>
                      유효고 {dr.deck.clearHeight}m · {dr.deck.weightCapacity}t
                    </span>
                  </div>
                  <svg
                    viewBox={`0 0 ${svgW} ${svgH}`}
                    width="100%"
                    className="border border-black/10 dark:border-white/15 rounded bg-black/[0.02] dark:bg-white/[0.03]"
                  >
                    {dr.placed.map((p, i) => (
                      <rect
                        key={i}
                        x={p.x * scale}
                        y={p.y * scale}
                        width={p.w * scale}
                        height={p.h * scale}
                        fill={p.color}
                        stroke="white"
                        strokeWidth={0.5}
                        rx={1}
                      >
                        <title>{p.name}</title>
                      </rect>
                    ))}
                  </svg>
                </div>
              );
            })}
          </div>

          <div className="flex flex-wrap gap-3 text-xs text-black/60 dark:text-white/60">
            {vehicleTypes.map((v) => (
              <span key={v.id} className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-sm inline-block" style={{ backgroundColor: v.color }} />
                {v.name}
              </span>
            ))}
          </div>

          <div className="rounded border border-black/10 dark:border-white/15 px-4 py-3 text-xs text-black/60 dark:text-white/60 leading-relaxed">
            <p className="font-medium text-black/80 dark:text-white/80 mb-1">안내</p>
            이 시뮬레이터는 데크의 유효고·허용중량과 2D 바닥면적만을 기준으로 한 근사
            알고리즘(shelf bin-packing)입니다. 실제 선적에는 램프 경사, 통로·회전 반경, 차량
            간 고박(라싱) 여유 공간, 데크별 접근 순서 등 이 모델이 반영하지 않은 제약이
            존재하므로, 결과는 참고용 추정치입니다.
          </div>
        </section>
      )}
    </div>
  );
}

function SummaryCard({
  label,
  value,
  highlight,
}: {
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <div
      className={`rounded border px-4 py-3 flex flex-col gap-1 ${
        highlight
          ? "border-amber-400/50 bg-amber-50 dark:bg-amber-950/30"
          : "border-black/10 dark:border-white/15"
      }`}
    >
      <span className="text-xs text-black/50 dark:text-white/50">{label}</span>
      <span className="text-lg font-semibold">{value}</span>
    </div>
  );
}
