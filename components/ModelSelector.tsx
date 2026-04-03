import { MODELS } from '@/lib/gemini';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Sparkles } from 'lucide-react';

interface ModelSelectorProps {
  selectedModel: string;
  onSelectModel: (model: string) => void;
}

export function ModelSelector({ selectedModel, onSelectModel }: ModelSelectorProps) {
  return (
    <Select value={selectedModel} onValueChange={onSelectModel}>
      <SelectTrigger className="w-[140px] sm:w-[200px] md:w-[280px] bg-background border-border">
        <div className="flex items-center gap-1 sm:gap-2 overflow-hidden">
          <Sparkles className="w-3 h-3 sm:w-4 sm:h-4 text-primary shrink-0" />
          <SelectValue placeholder="Select a model" />
        </div>
      </SelectTrigger>
      <SelectContent>
        <SelectGroup>
          <SelectLabel className="text-xs text-muted-foreground uppercase tracking-wider">AI Models</SelectLabel>
          {MODELS.filter(m => m.provider === 'google').map((model) => (
            <SelectItem key={model.id} value={model.id}>
              <div className="flex flex-col">
                <span className="font-medium">{model.name}</span>
                <span className="text-xs text-muted-foreground">{model.description}</span>
              </div>
            </SelectItem>
          ))}
        </SelectGroup>
        <SelectGroup>
          <SelectLabel className="text-xs text-muted-foreground uppercase tracking-wider mt-2">OpenAI</SelectLabel>
          {MODELS.filter(m => m.provider === 'openai').map((model) => (
            <SelectItem key={model.id} value={model.id}>
              <div className="flex flex-col">
                <span className="font-medium">{model.name}</span>
                <span className="text-xs text-muted-foreground">{model.description}</span>
              </div>
            </SelectItem>
          ))}
        </SelectGroup>
        <SelectGroup>
          <SelectLabel className="text-xs text-muted-foreground uppercase tracking-wider mt-2">Anthropic</SelectLabel>
          {MODELS.filter(m => m.provider === 'anthropic').map((model) => (
            <SelectItem key={model.id} value={model.id}>
              <div className="flex flex-col">
                <span className="font-medium">{model.name}</span>
                <span className="text-xs text-muted-foreground">{model.description}</span>
              </div>
            </SelectItem>
          ))}
        </SelectGroup>
      </SelectContent>
    </Select>
  );
}
