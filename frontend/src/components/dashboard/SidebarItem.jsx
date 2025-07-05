function SidebarItem({ icon, label, active = false }) {
  return (
    <div
      className={`w-full flex items-center gap-4 px-6 py-3 cursor-pointer hover:bg-blue-700 ${active ? "bg-blue-700" : ""}`}
    >
      <div className="text-lg">{icon}</div>
      <span className="text-sm font-medium">{label}</span>
    </div>
  );
}

export default SidebarItem;
