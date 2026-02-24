import React from 'react';

export default function CategoryPicker({ categories, selected, onChange, onSelect, singleSelect }) {
  const handleToggle = (catId) => {
    if (singleSelect && onSelect) {
      onSelect(catId);
      return;
    }
    if (selected.includes(catId)) {
      onChange(selected.filter((id) => id !== catId));
    } else {
      onChange([...selected, catId]);
    }
  };

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
      {categories.map((cat) => {
        const isSelected = selected.includes(cat.id);
        return (
          <button
            key={cat.id}
            onClick={() => handleToggle(cat.id)}
            className={`px-4 py-4 rounded-2xl border-2 transition-all text-left active:scale-95 ${
              singleSelect
                ? 'bg-white/5 border-white/10 hover:bg-white/10 hover:border-white/30'
                : isSelected
                ? 'bg-blue-500/20 border-blue-500/50'
                : 'bg-white/5 border-white/10 hover:bg-white/10'
            }`}
          >
            <div className="text-2xl mb-1">{cat.icon}</div>
            <div className="text-white font-bold text-sm leading-tight">{cat.name}</div>
            {cat.name_ar && (
              <div className="text-white/40 text-xs mt-0.5 font-arabic" dir="rtl">{cat.name_ar}</div>
            )}
            {cat.prompt_count !== undefined && (
              <div className="text-white/30 text-xs mt-1">{cat.prompt_count} prompts</div>
            )}
          </button>
        );
      })}
    </div>
  );
}
