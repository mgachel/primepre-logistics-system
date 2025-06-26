import logo from '../assets/primepre.logo.jpg';

function LogoHeader() {
  return (
    <div className="text-center mb-6">
      <img src={logo} alt="PrimePre Logo" className="w-32 mx-auto mb-2" />
      <p className="text-xs text-gray-600 uppercase tracking-wider">LARGE ENOUGH TO HANDLE</p>
      <p className="text-xs text-gray-600 uppercase tracking-wider">SMALL ENOUGH TO CARE</p>
    </div>
  );
}

export default LogoHeader;
