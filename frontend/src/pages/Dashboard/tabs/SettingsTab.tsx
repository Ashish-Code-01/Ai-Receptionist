import { Card } from "./dashboardUi";

type SettingsTabProps = {
    enabled: boolean;
    onChange: (enabled: boolean) => void;
};

export default function SettingsTab({ enabled, onChange }: SettingsTabProps) {
    return (
        <Card title="Receptionist settings" id="settings-title">
            <div className="flex items-center justify-between gap-4">
                <div>
                    <p className="m-0 text-[.92rem] font-semibold text-brand-text-h">Answer incoming calls</p>
                    <p className="m-0 text-[.85rem] text-brand-muted">Turn your AI receptionist on or off.</p>
                </div>
                <button
                    type="button"
                    role="switch"
                    aria-checked={enabled}
                    aria-label="Answer incoming calls"
                    onClick={() => onChange(!enabled)}
                    className={`relative h-7 w-12 shrink-0 cursor-pointer rounded-full border-0 transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--primary)] motion-reduce:transition-none ${enabled ? "bg-brand-secondary" : "bg-brand-border"}`}
                >
                    <span className={`absolute top-1 left-1 size-5 rounded-full bg-white shadow transition-transform motion-reduce:transition-none ${enabled ? "translate-x-5" : "translate-x-0"}`} />
                </button>
            </div>
        </Card>
    );
}
