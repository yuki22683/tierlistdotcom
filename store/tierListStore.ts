import { create } from 'zustand'

export type Tier = {
  id: string
  name: string
  color: string
  items: TierItem[]
}

export type TierItem = {
  id: string
  name: string // ユーザーが入力するラベル
  imageUrl?: string // 画像URL (オプショナル)
  backgroundColor?: string // 背景色 (テキストアイテム用)
  isTextItem?: boolean // テキストアイテムフラグ
  tempId?: string // 作成中の一時ID
}

interface TierListState {
  title: string
  description: string
  tiers: Tier[]
  unrankedItems: TierItem[] // まだ配置されていないアイテム
  tags: string[] // New
  allowVoting: boolean // New
  
  setTitle: (title: string) => void
  setDescription: (desc: string) => void
  setTiers: (tiers: Tier[]) => void
  setTags: (tags: string[]) => void // New
  setAllowVoting: (allow: boolean) => void // New
  addTag: (tag: string) => void // New
  removeTag: (tag: string) => void // New
  addTier: () => void
  updateTier: (id: string, updates: Partial<Tier>) => void
  deleteTier: (id: string) => void
  
  addUnrankedItem: (item: TierItem) => void
  addUnrankedTextItem: () => void // New
  removeUnrankedItem: (itemId: string) => void
  updateItemName: (itemId: string, newName: string) => void
  updateItemColor: (itemId: string, color: string) => void // New
  deleteItem: (itemId: string) => void // New
  moveItem: (source: { droppableId: string, index: number }, dest: { droppableId: string, index: number }) => void
  reset: () => void // Reset state
  initialize: (data: { title: string, description: string, tiers: Tier[], unrankedItems: TierItem[], tags?: string[], allowVoting?: boolean }) => void // Updated
}

const getDefaultTiers = () => [
  { id: 'tier-s', name: 'S', color: '#ff7f7f', items: [] },
  { id: 'tier-a', name: 'A', color: '#ffbf7f', items: [] },
  { id: 'tier-b', name: 'B', color: '#ffdf7f', items: [] },
  { id: 'tier-c', name: 'C', color: '#ffff7f', items: [] },
  { id: 'tier-d', name: 'D', color: '#bfff7f', items: [] },
]

export const useTierListStore = create<TierListState>((set) => ({
  title: '',
  description: '',
  tiers: getDefaultTiers(),
  unrankedItems: [],
  tags: [], // New
  allowVoting: true, // New

  setTitle: (title) => set({ title }),
  setDescription: (description) => set({ description }),
  setTiers: (tiers) => set({ tiers }),
  setTags: (tags) => set({ tags }), // New
  setAllowVoting: (allow) => set({ allowVoting: allow }), // New
  
  addTag: (tag) => set((state) => {
      if (state.tags.length >= 5) return state;
      if (state.tags.includes(tag)) return state;
      return { tags: [...state.tags, tag] }
  }),
  
  removeTag: (tag) => set((state) => ({
      tags: state.tags.filter(t => t !== tag)
  })),

  reset: () => set({ 
      title: '', 
      description: '', 
      tiers: getDefaultTiers(), 
      unrankedItems: [],
      tags: [], // Reset tags
      allowVoting: true // Reset allowVoting
  }),
  initialize: (data) => set({
      title: data.title,
      description: data.description,
      tiers: data.tiers,
      unrankedItems: data.unrankedItems,
      tags: data.tags || [], // Initialize tags
      allowVoting: data.allowVoting !== undefined ? data.allowVoting : true // Initialize allowVoting
  }),

  addTier: () => set((state) => ({
    tiers: [...state.tiers, {
      id: `tier-${Date.now()}`,
      name: '',
      color: '#cccccc',
      items: []
    }]
  })),

  updateTier: (id, updates) => set((state) => ({
    tiers: state.tiers.map((t) => t.id === id ? { ...t, ...updates } : t)
  })),

  deleteTier: (id) => set((state) => ({
    tiers: state.tiers.filter((t) => t.id !== id)
  })),

  addUnrankedItem: (item) => set((state) => ({
    unrankedItems: [...state.unrankedItems, item]
  })),

  addUnrankedTextItem: () => set((state) => ({
    unrankedItems: [...state.unrankedItems, {
      id: Math.random().toString(36).substr(2, 9),
      name: '',
      isTextItem: true,
      backgroundColor: '#ffffff' // Default white
    }]
  })),

  removeUnrankedItem: (itemId) => set((state) => ({
    unrankedItems: state.unrankedItems.filter(i => i.id !== itemId)
  })),

  deleteItem: (itemId) => set((state) => ({
    unrankedItems: state.unrankedItems.filter(i => i.id !== itemId),
    tiers: state.tiers.map(t => ({
      ...t,
      items: t.items.filter(i => i.id !== itemId)
    }))
  })),

  updateItemName: (itemId, newName) => set((state) => {
    // Check unranked items
    const unrankedIndex = state.unrankedItems.findIndex(i => i.id === itemId);
    if (unrankedIndex !== -1) {
      const newUnranked = [...state.unrankedItems];
      newUnranked[unrankedIndex] = { ...newUnranked[unrankedIndex], name: newName };
      return { unrankedItems: newUnranked };
    }

    // Check ranked items in tiers
    const newTiers = state.tiers.map(tier => {
      const itemIndex = tier.items.findIndex(i => i.id === itemId);
      if (itemIndex !== -1) {
        const newItems = [...tier.items];
        newItems[itemIndex] = { ...newItems[itemIndex], name: newName };
        return { ...tier, items: newItems };
      }
      return tier;
    });

    return { tiers: newTiers };
  }),

  updateItemColor: (itemId, color) => set((state) => {
    // Check unranked items
    const unrankedIndex = state.unrankedItems.findIndex(i => i.id === itemId);
    if (unrankedIndex !== -1) {
      const newUnranked = [...state.unrankedItems];
      newUnranked[unrankedIndex] = { ...newUnranked[unrankedIndex], backgroundColor: color };
      return { unrankedItems: newUnranked };
    }

    // Check ranked items in tiers
    const newTiers = state.tiers.map(tier => {
      const itemIndex = tier.items.findIndex(i => i.id === itemId);
      if (itemIndex !== -1) {
        const newItems = [...tier.items];
        newItems[itemIndex] = { ...newItems[itemIndex], backgroundColor: color };
        return { ...tier, items: newItems };
      }
      return tier;
    });

    return { tiers: newTiers };
  }),

  moveItem: (source, dest) => set((state) => {
    const newTiers = [...state.tiers];
    const newUnranked = [...state.unrankedItems];

    // Helper to get list by ID
    const getList = (id: string) => {
      if (id === 'unranked') return newUnranked;
      return newTiers.find(t => t.id === id)?.items || [];
    };

    // Helper to set list by ID (mutates the arrays above)
    const setList = (id: string, items: TierItem[]) => {
      if (id === 'unranked') {
          // Can't assign directly to newUnranked because we are inside the function scope, 
          // but we can modify the array content if we splice correctly or we just return the new state at the end.
          // Actually, for unranked, we are operating on `newUnranked` array directly.
          // For tiers, we need to update the `newTiers` array.
      } else {
         const tierIndex = newTiers.findIndex(t => t.id === id);
         if (tierIndex !== -1) {
             newTiers[tierIndex] = { ...newTiers[tierIndex], items };
         }
      }
    };

    const sourceList = source.droppableId === 'unranked' ? newUnranked : newTiers.find(t => t.id === source.droppableId)?.items;
    const destList = dest.droppableId === 'unranked' ? newUnranked : newTiers.find(t => t.id === dest.droppableId)?.items;

    if (!sourceList || !destList) return {};

    const [movedItem] = sourceList.splice(source.index, 1);
    destList.splice(dest.index, 0, movedItem);

    // If unranked was modified, we need to make sure we return it in the state update
    return {
      tiers: newTiers,
      unrankedItems: newUnranked
    };
  })

}))
