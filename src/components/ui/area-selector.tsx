import React from 'react';
import type { Area } from '@/types';

interface AreaSelectorProps {
  label: string;
  areas: Area[];
  selectedId: string | null;
  onSelect: (areaId: string | null) => void;
  disabled?: boolean;
  nullable?: boolean;
  nullLabel?: string;
}

export const AreaSelector: React.FC<AreaSelectorProps> = ({
  label,
  areas,
  selectedId,
  onSelect,
  disabled = false,
  nullable = true,
  nullLabel = 'Nenhuma',
}) => {
  const selectedArea = selectedId && selectedId !== 'none' ? areas.find((a) => a.id === selectedId) : null;

  return (
    <div className="space-y-2">
      <label className="text-sm font-medium text-white/70">{label}</label>
      
      <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
        {/* Nenhuma option */}
        {nullable && (
          <button
            onClick={() => onSelect(null)}
            disabled={disabled}
            className={`w-full px-3 py-2 rounded-lg border-2 transition-all text-left text-sm font-medium
              ${selectedId === null || selectedId === 'none'
                ? 'border-white/30 bg-white/5 text-white'
                : 'border-white/10 bg-transparent text-white/60 hover:border-white/20 hover:bg-white/3'
              }
              ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
            `}
          >
            {nullLabel}
          </button>
        )}

        {/* Área options */}
        {areas.map((area) => (
          <button
            key={area.id}
            onClick={() => onSelect(area.id)}
            disabled={disabled}
            className={`w-full px-3 py-2 rounded-lg border-2 transition-all text-left text-sm font-medium flex items-center gap-2
              ${selectedId === area.id
                ? `border-[${area.color}] bg-[${area.color}]08 text-white`
                : `border-[${area.color}]20 bg-[${area.color}]05 text-white/70 hover:border-[${area.color}]40 hover:bg-[${area.color}]08`
              }
              ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
            `}
            style={{
              borderColor: selectedId === area.id ? `${area.color}80` : `${area.color}40`,
              backgroundColor: `${area.color}08`,
            }}
          >
            <div
              className="w-3 h-3 rounded-full flex-shrink-0"
              style={{ backgroundColor: area.color }}
            />
            <span className="flex-1">{area.name}</span>
            {selectedId === area.id && (
              <svg className="w-4 h-4 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
            )}
          </button>
        ))}
      </div>

      {/* Preview */}
      {selectedArea && (
        <div
          className="mt-2 p-2 rounded-lg text-white text-xs font-medium flex items-center gap-2"
          style={{
            backgroundColor: `${selectedArea.color}15`,
            borderLeft: `3px solid ${selectedArea.color}`,
          }}
        >
          <div
            className="w-2 h-2 rounded-full"
            style={{ backgroundColor: selectedArea.color }}
          />
          Selecionado: {selectedArea.name}
        </div>
      )}
    </div>
  );
};

interface SubareaSelectorProps {
  label: string;
  subareas: Area[];
  selectedId: string | null;
  onSelect: (subareaId: string | null) => void;
  parentArea?: Area | null;
  disabled?: boolean;
  nullable?: boolean;
  nullLabel?: string;
}

export const SubareaSelector: React.FC<SubareaSelectorProps> = ({
  label,
  subareas,
  selectedId,
  onSelect,
  parentArea,
  disabled = false,
  nullable = true,
  nullLabel = 'Nenhuma',
}) => {
  const selectedSubarea = selectedId && selectedId !== 'none' ? subareas.find((s) => s.id === selectedId) : null;

  return (
    <div className="space-y-2">
      <label className="text-sm font-medium text-white/70">{label}</label>
      
      <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
        {/* Nenhuma option */}
        {nullable && (
          <button
            onClick={() => onSelect(null)}
            disabled={disabled}
            className={`w-full px-3 py-2 rounded-lg border-2 transition-all text-left text-sm font-medium
              ${selectedId === null || selectedId === 'none'
                ? 'border-white/30 bg-white/5 text-white'
                : 'border-white/10 bg-transparent text-white/60 hover:border-white/20 hover:bg-white/3'
              }
              ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
            `}
          >
            {nullLabel}
          </button>
        )}

        {/* Subárea options */}
        {subareas.map((subarea) => {
          const displayColor = parentArea?.color || '#FFFFFF';
          
          return (
            <button
              key={subarea.id}
              onClick={() => onSelect(subarea.id)}
              disabled={disabled}
              className={`w-full px-3 py-2 rounded-lg border-2 transition-all text-left text-sm font-medium flex items-center gap-2
                ${selectedId === subarea.id
                  ? `text-white`
                  : `text-white/70 hover:text-white/80`
                }
                ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
              `}
              style={{
                borderColor: selectedId === subarea.id ? `${displayColor}80` : `${displayColor}40`,
                backgroundColor: selectedId === subarea.id ? `${displayColor}12` : `${displayColor}08`,
              }}
            >
              <div
                className="w-3 h-3 rounded-full flex-shrink-0 opacity-60"
                style={{ backgroundColor: displayColor }}
              />
              <span className="flex-1">{subarea.name}</span>
              {selectedId === subarea.id && (
                <svg className="w-4 h-4 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
              )}
            </button>
          );
        })}
      </div>

      {/* Preview */}
      {selectedSubarea && parentArea && (
        <div
          className="mt-2 p-2 rounded-lg text-white text-xs font-medium flex items-center gap-2"
          style={{
            backgroundColor: `${parentArea.color}15`,
            borderLeft: `3px solid ${parentArea.color}`,
          }}
        >
          <div
            className="w-2 h-2 rounded-full opacity-60"
            style={{ backgroundColor: parentArea.color }}
          />
          {selectedSubarea.name}
        </div>
      )}
    </div>
  );
};
