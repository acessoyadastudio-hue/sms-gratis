import React from 'react';
import { LucideIcon } from 'lucide-react';

interface ServiceCardProps {
  id: string;
  name: string;
  icon: LucideIcon;
  price: string;
  onSelect: (id: string) => void;
  disabled?: boolean;
}

const ServiceCard: React.FC<ServiceCardProps> = ({ id, name, icon: Icon, price, onSelect, disabled }) => {
  return (
    <button
      onClick={() => onSelect(id)}
      disabled={disabled}
      className="group relative flex flex-col items-center justify-center p-6 bg-zinc-900/50 border border-zinc-800 rounded-2xl transition-all hover:bg-zinc-800/80 hover:border-zinc-700 hover:-translate-y-1 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
    >
      <div className="mb-4 p-4 rounded-full bg-white/5 group-hover:bg-white/10 transition-colors">
        <Icon size={32} className="text-white" />
      </div>
      <h3 className="text-sm font-semibold text-zinc-300 group-hover:text-white transition-colors">{name}</h3>
      <p className="mt-1 text-xs font-mono text-zinc-500 group-hover:text-zinc-400">R$ {price}</p>
      
      {/* Glow effect on hover */}
      <div className="absolute inset-0 rounded-2xl bg-white/5 opacity-0 group-hover:opacity-100 transition-opacity blur-xl -z-10" />
    </button>
  );
};

export default ServiceCard;
