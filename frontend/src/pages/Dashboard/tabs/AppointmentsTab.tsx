import type { DashboardData } from "./dashboardTypes";
import { AppointmentList, Card } from "./dashboardUi";

export default function AppointmentsTab({ data }: { data: DashboardData }) {
    return (
        <Card title="Appointments" id="appointments-title">
            <AppointmentList appointments={data.appointments} />
        </Card>
    );
}
