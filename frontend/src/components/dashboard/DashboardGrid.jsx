import DashboardCard from "/DashboardCard";

function DashboardGrid() {
  return (
    <div className="p-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
      <DashboardCard className="h-24">Card 1</DashboardCard>
      <DashboardCard className="h-24">Card 2</DashboardCard>
      <DashboardCard className="h-24">Card 3</DashboardCard>
      <DashboardCard className="h-24">Card 4</DashboardCard>
      <DashboardCard className="h-32 col-span-2">Card 5</DashboardCard>
      <DashboardCard className="h-48 row-span-2 col-span-2">Card 6</DashboardCard>
      <DashboardCard className="h-24">Card 7</DashboardCard>
      <DashboardCard className="h-24">Card 8</DashboardCard>
    </div>
  );
}

export default DashboardGrid;
