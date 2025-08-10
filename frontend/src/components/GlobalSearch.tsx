import { useEffect, useMemo, useState } from "react";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Search } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useDebounce } from "@/hooks/useDebounce";
import { cargoService } from "@/services/cargoService";
import { clientService } from "@/services/clientService";

interface Suggestion {
  id: string;
  type: "tracking" | "container" | "awb" | "client" | "route";
  label: string;
  sub?: string;
  href?: string;
}

export function GlobalSearch() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const q = useDebounce(query, 200);
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const navigate = useNavigate();

  useEffect(() => {
    let ignore = false;
    async function load() {
      if (!q || q.length < 2) {
        setSuggestions([]);
        return;
      }
      try {
        const [clientsRes, seaRes, airItemsRes] = await Promise.all([
          clientService.searchClients(q),
          cargoService.getContainers({ cargo_type: "sea", search: q }),
          cargoService.getCargoItems({ status: undefined }),
        ]);
        if (ignore) return;
        const items: Suggestion[] = [];
        // Clients
        (clientsRes.data || []).slice(0, 5).forEach((c) =>
          items.push({ id: String(c.id), type: "client", label: c.full_name || `${c.first_name} ${c.last_name}`.trim(), sub: c.email || c.phone, href: `/clients` })
        );
        // Sea containers
        (seaRes.data?.results || []).slice(0, 5).forEach((c) =>
          items.push({ id: c.container_id, type: "container", label: c.container_id, sub: c.route || "-", href: `/cargos/sea` })
        );
        // Air items (treat tracking/awb)
        (airItemsRes.data?.results || []).filter(i=>i.tracking_id?.toLowerCase().includes(q.toLowerCase())).slice(0, 5).forEach((i) =>
          items.push({ id: i.id, type: "awb", label: i.tracking_id || i.id, sub: i.client_name || "", href: `/cargos/air` })
        );
        setSuggestions(items);
      } catch (e) {
        setSuggestions([]);
      }
    }
    load();
    return () => { ignore = true };
  }, [q]);

  const onSelect = (s: Suggestion) => {
    setOpen(false);
    if (s.href) navigate(s.href + `?q=${encodeURIComponent(s.label)}`);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm" aria-label="Search">
          <Search className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="p-0 gap-0 overflow-hidden">
        <Command shouldFilter={false}>
          <CommandInput placeholder="Search tracking IDs, clients, containers, or routes" value={query} onValueChange={setQuery} />
          <CommandList>
            <CommandEmpty>No results.</CommandEmpty>
            <CommandGroup heading="Results">
              {suggestions.map((s) => (
                <CommandItem key={`${s.type}-${s.id}`} value={s.label} onSelect={() => onSelect(s)}>
                  <div className="flex flex-col">
                    <span className="font-medium">{s.label}</span>
                    {s.sub && <span className="text-xs text-muted-foreground">{s.sub}</span>}
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </DialogContent>
    </Dialog>
  );
}
