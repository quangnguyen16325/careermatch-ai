import { useEffect, useState } from "react";
import { Plus, RotateCw, X } from "lucide-react";
import { Button } from "../../../components/ui/Button";
import {
  addSkillSelection,
  removeSkillSelection,
  updateSkillSelection,
} from "../job-editor/skillSelection";
import { searchSkillCatalog } from "../job-editor/skillCatalogApi";
import type { SelectedJobSkill } from "../job-editor/skillSelection";
import type { SkillCatalogItem } from "../job-editor/types";

type RequiredSkillSelectorProps = {
  selectedSkills: SelectedJobSkill[];
  onChange: (skills: SelectedJobSkill[]) => void;
};

function RequiredSkillSelector({
  selectedSkills,
  onChange,
}: RequiredSkillSelectorProps) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SkillCatalogItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [retryKey, setRetryKey] = useState(0);
  const normalizedQuery = query.trim();

  useEffect(() => {
    if (!normalizedQuery) return;

    const controller = new AbortController();
    let active = true;
    const timer = window.setTimeout(() => {
      void searchSkillCatalog(normalizedQuery, { signal: controller.signal })
        .then((skills) => {
          if (active) setResults(skills);
        })
        .catch(() => {
          if (active && !controller.signal.aborted) {
            setResults([]);
            setError("Could not load skills. Check your connection and try again.");
          }
        })
        .finally(() => {
          if (active) setLoading(false);
        });
    }, 250);

    return () => {
      active = false;
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [normalizedQuery, retryKey]);

  function isSelected(skillId: string) {
    return selectedSkills.some(
      ({ id }) => id.toLowerCase() === skillId.toLowerCase(),
    );
  }

  return (
    <div className="space-y-4">
      <label className="block text-sm font-medium text-slate-700" htmlFor="skill-search">
        Search skill catalog
        <input
          autoComplete="off"
          className="mt-1.5 min-h-11 w-full rounded-xl border border-slate-200 bg-white px-3.5 text-sm text-slate-900 outline-none focus-visible:border-emerald-600 focus-visible:ring-4 focus-visible:ring-emerald-500/15"
          id="skill-search"
          onChange={(event) => {
            const nextQuery = event.target.value;
            setQuery(nextQuery);
            setResults([]);
            setError("");
            setLoading(Boolean(nextQuery.trim()));
          }}
          placeholder="For example, React"
          type="search"
          value={query}
        />
      </label>

      {loading ? <p className="text-sm text-slate-600" role="status">Searching skills…</p> : null}
      {error ? (
        <div className="flex flex-col gap-2 rounded-lg border border-rose-200 bg-rose-50 p-3 sm:flex-row sm:items-center sm:justify-between" role="alert">
          <p className="text-sm text-rose-800">{error}</p>
          <Button
            icon={<RotateCw size={16} />}
            onClick={() => {
              setLoading(true);
              setError("");
              setRetryKey((key) => key + 1);
            }}
            type="button"
            variant="secondary"
          >
            Retry
          </Button>
        </div>
      ) : null}
      {!loading && !error && normalizedQuery && results.length === 0 ? (
        <p className="text-sm text-slate-600" role="status">No matching skills found.</p>
      ) : null}
      {!normalizedQuery ? <p className="text-sm text-slate-600">Enter a skill name to search the catalog.</p> : null}

      {results.length > 0 ? (
        <ul aria-label="Skill search results" className="divide-y divide-slate-100 rounded-xl border border-slate-200">
          {results.map((skill) => (
            <li className="flex min-w-0 items-center justify-between gap-3 p-3" key={skill.id}>
              <span className="min-w-0 break-words text-sm font-medium text-slate-800">{skill.name}</span>
              <Button
                aria-label={isSelected(skill.id) ? `${skill.name} already selected` : `Add ${skill.name}`}
                disabled={isSelected(skill.id)}
                icon={<Plus size={16} />}
                onClick={() => onChange(addSkillSelection(selectedSkills, skill))}
                type="button"
                variant="secondary"
              >
                {isSelected(skill.id) ? "Added" : "Add"}
              </Button>
            </li>
          ))}
        </ul>
      ) : null}

      <fieldset className="min-w-0 space-y-3">
        <legend className="text-sm font-semibold text-slate-800">Selected skills ({selectedSkills.length})</legend>
        {selectedSkills.length === 0 ? (
          <p className="rounded-lg bg-slate-50 p-3 text-sm text-slate-600">No skills selected. This field is optional.</p>
        ) : (
          <ul className="space-y-3">
            {selectedSkills.map((skill) => (
              <li className="grid min-w-0 gap-3 rounded-xl border border-slate-200 p-3 sm:grid-cols-[minmax(0,1fr)_auto_auto_auto] sm:items-center" key={skill.id}>
                <span className="min-w-0 break-words text-sm font-medium text-slate-800">{skill.name}</span>
                <label className="flex min-h-10 items-center gap-2 text-sm text-slate-700">
                  <input
                    checked={skill.required}
                    onChange={(event) => onChange(updateSkillSelection(selectedSkills, skill.id, { required: event.target.checked }))}
                    type="checkbox"
                  />
                  Required
                </label>
                <label className="flex items-center gap-2 text-sm text-slate-700">
                  Weight
                  <input
                    aria-label={`${skill.name} weight`}
                    className="min-h-10 w-24 rounded-lg border border-slate-200 px-2 text-sm outline-none focus-visible:border-emerald-600 focus-visible:ring-4 focus-visible:ring-emerald-500/15"
                    max={10}
                    min={0.1}
                    onChange={(event) => onChange(updateSkillSelection(selectedSkills, skill.id, { weight: Number(event.target.value) }))}
                    step={0.1}
                    type="number"
                    value={Number.isFinite(skill.weight) ? skill.weight : ""}
                  />
                </label>
                <Button
                  aria-label={`Remove ${skill.name}`}
                  icon={<X size={16} />}
                  onClick={() => onChange(removeSkillSelection(selectedSkills, skill.id))}
                  type="button"
                  variant="ghost"
                >
                  Remove
                </Button>
              </li>
            ))}
          </ul>
        )}
      </fieldset>
    </div>
  );
}

export { RequiredSkillSelector };
export type { RequiredSkillSelectorProps };
