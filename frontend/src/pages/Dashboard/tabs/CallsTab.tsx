import type { DashboardData } from "./dashboardTypes";
import { CallList, Card } from "./dashboardUi";

export default function CallsTab({ data }: { data: DashboardData }) {
    return (
        <Card title="Recent calls" id="calls-title">
            <CallList calls={data.recentCalls} />
        </Card>
    );
}
