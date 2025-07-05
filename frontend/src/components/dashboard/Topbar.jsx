import { FaBell } from "react-icons/fa";

function Topbar() {
  return (
    <div className="flex items-center justify-between bg-white py-4 px-6 shadow sticky top-0 z-10">
      <div className="flex items-center gap-4 w-full max-w-md">
        <input
          type="text"
          placeholder="Search"
          className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      <div className="text-gray-600 text-xl cursor-pointer">
        <FaBell />
      </div>
    </div>
  );
}

export default Topbar;
