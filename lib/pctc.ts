// PCTC(Pure Car and Truck Carrier) 데크 적재 최적화 엔진
//
// 실제 PCTC의 정확한 데크 제원(단수, 면적, 유효고, 데크별 허용중량)은 선사·선형별로
// 다르고 공개되어 있지 않으므로, 이 모듈의 기본값은 6,500 CEU급 PCTC를 참고해 만든
// "교육/포트폴리오 목적의 예시 사양"이다. 알고리즘은 2D shelf(선반) 기반 bin-packing
// 휴리스틱으로, 실제 라싱(고박) 규정이나 램프 경사·통로 폭 등은 반영하지 않은 근사치다.

export interface VehicleType {
  id: string;
  name: string;
  /** 차량 전장 (m) */
  length: number;
  /** 차량 전폭 (m) */
  width: number;
  /** 차량 전고 (m) */
  height: number;
  /** 공차중량 (ton) */
  weight: number;
  color: string;
}

export interface VehicleEntry {
  vehicleTypeId: string;
  quantity: number;
}

export interface Deck {
  id: string;
  name: string;
  /** 데크 길이 - 선체 길이 방향 (m) */
  length: number;
  /** 데크 폭 - 선체 폭 방향 (m) */
  width: number;
  /** 유효고 (m) - 이 높이를 초과하는 차량은 적재 불가 */
  clearHeight: number;
  /** 데크 허용 총중량 (ton) */
  weightCapacity: number;
}

export interface PlacedVehicle {
  vehicleTypeId: string;
  name: string;
  color: string;
  /** 데크 길이축(x) 상의 시작 위치 (m) */
  x: number;
  /** 데크 폭축(y) 상의 시작 위치 (m) */
  y: number;
  /** 길이축(x) 방향 점유폭 (m) */
  w: number;
  /** 폭축(y) 방향 점유폭 (m) */
  h: number;
  weight: number;
}

interface Shelf {
  x: number;
  depth: number;
  usedWidth: number;
}

interface DeckState {
  deck: Deck;
  shelves: Shelf[];
  usedLength: number;
  usedWeight: number;
  placed: PlacedVehicle[];
}

export interface DeckResult {
  deck: Deck;
  placed: PlacedVehicle[];
  usedArea: number;
  usedWeight: number;
  areaUtilization: number;
  weightUtilization: number;
  loadedCount: number;
}

export interface OptimizationResult {
  deckResults: DeckResult[];
  totalRequested: number;
  loadedCount: number;
  unloadedCount: number;
  unloadedByType: { vehicleTypeId: string; name: string; count: number }[];
  overallAreaUtilization: number;
  overallWeightUtilization: number;
}

function tryInsertOnDeck(
  state: DeckState,
  item: { length: number; width: number; weight: number }
): { x: number; y: number; w: number; h: number } | null {
  const { deck } = state;

  if (state.usedWeight + item.weight > deck.weightCapacity + 1e-9) {
    return null;
  }

  // 두 방향(회전 허용) 중 데크에 들어갈 수 있는 조합만 남긴다.
  // lx: 길이축(선반 depth 방향) 점유폭, ly: 폭축(선반 내 진행 방향) 점유폭
  const orientations = [
    { lx: item.length, ly: item.width },
    { lx: item.width, ly: item.length },
  ].filter((o) => o.ly <= deck.width + 1e-9);

  if (orientations.length === 0) return null;

  // 1) 현재 열려있는 마지막 선반에 먼저 넣어본다.
  const last = state.shelves[state.shelves.length - 1];
  if (last) {
    const fits = orientations
      .filter((o) => o.lx <= last.depth + 1e-9 && last.usedWidth + o.ly <= deck.width + 1e-9)
      // depth를 가장 알차게 채우는(낭비가 적은) 방향을 우선한다.
      .sort((a, b) => b.lx - a.lx);
    if (fits.length > 0) {
      const o = fits[0];
      const x = last.x;
      const y = last.usedWidth;
      last.usedWidth += o.ly;
      // w: 길이축(x) 방향 점유폭, h: 폭축(y) 방향 점유폭
      return { x, y, w: o.lx, h: o.ly };
    }
  }

  // 2) 새 선반을 열어본다.
  const remainingLength = deck.length - state.usedLength;
  const candidates = orientations
    .filter((o) => o.lx <= remainingLength + 1e-9)
    // 다음 선반을 위해 길이를 아낄 수 있도록, depth가 작은 방향을 우선한다.
    .sort((a, b) => a.lx - b.lx);

  if (candidates.length === 0) return null;

  const o = candidates[0];
  const x = state.usedLength;
  state.shelves.push({ x, depth: o.lx, usedWidth: o.ly });
  state.usedLength += o.lx;
  return { x, y: 0, w: o.lx, h: o.ly };
}

export function optimizeLoading(
  entries: VehicleEntry[],
  vehicleTypes: VehicleType[],
  decks: Deck[]
): OptimizationResult {
  const typeById = new Map(vehicleTypes.map((t) => [t.id, t]));

  type Instance = { vehicleTypeId: string; type: VehicleType };
  const instances: Instance[] = [];
  for (const e of entries) {
    const type = typeById.get(e.vehicleTypeId);
    if (!type) continue;
    for (let i = 0; i < e.quantity; i++) {
      instances.push({ vehicleTypeId: e.vehicleTypeId, type });
    }
  }

  // 유효고가 낮은 데크는 적재 가능 차종이 제한적이므로, 키가 큰(높이가 높은) 차량부터
  // 먼저 배치해 "고배기량 차량이 갈 곳이 없어지는" 상황을 줄인다.
  // 동일 높이대에서는 바닥면적이 큰 차량을 먼저 배치해 선반 낭비를 줄인다 (BFD 휴리스틱).
  instances.sort((a, b) => {
    if (b.type.height !== a.type.height) return b.type.height - a.type.height;
    return b.type.length * b.type.width - a.type.length * a.type.width;
  });

  const deckStates: DeckState[] = decks.map((deck) => ({
    deck,
    shelves: [],
    usedLength: 0,
    usedWeight: 0,
    placed: [],
  }));

  const unloadedCounts = new Map<string, number>();

  for (const inst of instances) {
    const { type } = inst;

    // 유효고를 만족하는 데크 중, 유효고가 낮은 순으로 우선 시도한다.
    // (여유 있는 높은 데크는 키 큰 차량을 위해 최대한 아껴둔다)
    // 같은 유효고 등급 안에서는 "채움 비율이 가장 낮은" 데크를 우선해, 한 데크를
    // 먼저 꽉 채우고 다음 데크로 넘어가는 대신 같은 등급의 데크들이 고르게 채워지도록 한다.
    const candidates = deckStates
      .filter((s) => s.deck.clearHeight >= type.height - 1e-9)
      .sort((a, b) => {
        if (a.deck.clearHeight !== b.deck.clearHeight) {
          return a.deck.clearHeight - b.deck.clearHeight;
        }
        const utilA = a.usedLength / a.deck.length;
        const utilB = b.usedLength / b.deck.length;
        return utilA - utilB;
      });

    let placed = false;
    for (const state of candidates) {
      const result = tryInsertOnDeck(state, {
        length: type.length,
        width: type.width,
        weight: type.weight,
      });
      if (result) {
        state.usedWeight += type.weight;
        state.placed.push({
          vehicleTypeId: type.id,
          name: type.name,
          color: type.color,
          x: result.x,
          y: result.y,
          w: result.w,
          h: result.h,
          weight: type.weight,
        });
        placed = true;
        break;
      }
    }

    if (!placed) {
      unloadedCounts.set(type.id, (unloadedCounts.get(type.id) ?? 0) + 1);
    }
  }

  const deckResults: DeckResult[] = deckStates.map((s) => {
    const deckArea = s.deck.length * s.deck.width;
    const usedArea = s.placed.reduce((sum, p) => sum + p.w * p.h, 0);
    return {
      deck: s.deck,
      placed: s.placed,
      usedArea,
      usedWeight: s.usedWeight,
      areaUtilization: deckArea > 0 ? usedArea / deckArea : 0,
      weightUtilization: s.deck.weightCapacity > 0 ? s.usedWeight / s.deck.weightCapacity : 0,
      loadedCount: s.placed.length,
    };
  });

  const totalArea = decks.reduce((sum, d) => sum + d.length * d.width, 0);
  const totalUsedArea = deckResults.reduce((sum, d) => sum + d.usedArea, 0);
  const totalWeightCap = decks.reduce((sum, d) => sum + d.weightCapacity, 0);
  const totalUsedWeight = deckResults.reduce((sum, d) => sum + d.usedWeight, 0);

  const loadedCount = deckResults.reduce((sum, d) => sum + d.loadedCount, 0);
  const unloadedCount = instances.length - loadedCount;

  const unloadedByType = Array.from(unloadedCounts.entries()).map(([vehicleTypeId, count]) => ({
    vehicleTypeId,
    name: typeById.get(vehicleTypeId)?.name ?? vehicleTypeId,
    count,
  }));

  return {
    deckResults,
    totalRequested: instances.length,
    loadedCount,
    unloadedCount,
    unloadedByType,
    overallAreaUtilization: totalArea > 0 ? totalUsedArea / totalArea : 0,
    overallWeightUtilization: totalWeightCap > 0 ? totalUsedWeight / totalWeightCap : 0,
  };
}

export const DEFAULT_VEHICLE_TYPES: VehicleType[] = [
  { id: "compact-sedan", name: "소형 세단", length: 4.3, width: 1.75, height: 1.45, weight: 1.1, color: "#60a5fa" },
  { id: "midsize-sedan", name: "중형 세단", length: 4.9, width: 1.86, height: 1.47, weight: 1.5, color: "#3b82f6" },
  { id: "compact-suv", name: "준중형 SUV", length: 4.5, width: 1.85, height: 1.65, weight: 1.7, color: "#34d399" },
  { id: "large-suv", name: "대형 SUV", length: 5.0, width: 1.98, height: 1.75, weight: 2.2, color: "#10b981" },
  { id: "pickup", name: "픽업트럭", length: 5.4, width: 1.95, height: 1.85, weight: 2.1, color: "#f59e0b" },
  { id: "small-truck", name: "소형 화물트럭", length: 6.2, width: 2.2, height: 2.6, weight: 4.5, color: "#ef4444" },
];

// 6,500 CEU급 PCTC를 참고한 예시 데크 사양 (교육/포트폴리오 목적, 실제 선박과 다를 수 있음)
export const DEFAULT_DECKS: Deck[] = [
  { id: "deck-1", name: "1번 데크 (Lower Hold)", length: 34, width: 32, clearHeight: 1.6, weightCapacity: 900 },
  { id: "deck-2", name: "2번 데크", length: 34, width: 32, clearHeight: 1.6, weightCapacity: 850 },
  { id: "deck-3", name: "3번 데크", length: 34, width: 32, clearHeight: 1.65, weightCapacity: 850 },
  { id: "deck-4", name: "4번 데크 (호이스터블)", length: 34, width: 32, clearHeight: 1.7, weightCapacity: 800 },
  { id: "deck-5", name: "5번 데크", length: 34, width: 32, clearHeight: 1.6, weightCapacity: 800 },
  { id: "deck-6", name: "6번 데크", length: 32, width: 30, clearHeight: 1.65, weightCapacity: 750 },
  { id: "deck-7", name: "7번 데크 (고차고)", length: 32, width: 30, clearHeight: 2.6, weightCapacity: 700 },
  { id: "deck-8", name: "8번 데크", length: 30, width: 28, clearHeight: 1.65, weightCapacity: 650 },
  { id: "deck-9", name: "9번 데크", length: 28, width: 26, clearHeight: 1.6, weightCapacity: 550 },
  { id: "deck-10", name: "10번 데크 (Weather Deck)", length: 26, width: 24, clearHeight: 4.5, weightCapacity: 450 },
];
