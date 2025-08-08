import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Home, ArrowLeft } from 'lucide-react';

export default function NotFound() {
  // Animation phases: 'truck-in', 'cart-in', 'pause', 'truck-out', 'cart-out'
  const [phase, setPhase] = useState<'truck-in' | 'cart-in' | 'pause' | 'truck-out' | 'cart-out'>('truck-in');
  const navigate = useNavigate();

  useEffect(() => {
    if (phase === 'truck-in') {
      // After truck arrives, start cart
      const t = setTimeout(() => setPhase('cart-in'), 1200);
      return () => clearTimeout(t);
    }
    if (phase === 'cart-in') {
      // After cart arrives, pause for 3s
      const t = setTimeout(() => setPhase('pause'), 1200);
      return () => clearTimeout(t);
    }
    if (phase === 'pause') {
      // After pause, truck leaves and cart flips
      const t = setTimeout(() => setPhase('truck-out'), 3000);
      return () => clearTimeout(t);
    }
    if (phase === 'truck-out') {
      // After truck leaves, cart leaves
      const t = setTimeout(() => setPhase('cart-out'), 800);
      return () => clearTimeout(t);
    }
  }, [phase]);

  // Truck stops at 15vw, cart stops at 15vw - 240px
  const TRUCK_STOP = '15vw';
  const CART_STOP = 'calc(15vw - 240px)';

  // Show text only when vehicles are leaving
  const showText = phase === 'truck-out' || phase === 'cart-out';

  return (
    <div className="min-h-screen relative overflow-hidden">
      {/* Brand background */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary via-primary/80 to-secondary"></div>
      <div className="absolute inset-0 bg-gradient-to-tl from-white/20 via-transparent to-primary/30 [clip-path:polygon(0_0,100%_0,100%_85%,0_100%)]"></div>
      <div className="absolute inset-0 opacity-20">
        <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-r from-transparent via-white/10 to-transparent transform -skew-y-12"></div>
        <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-r from-transparent via-primary/20 to-transparent transform skew-y-6"></div>
      </div>

      {/* Truck Animation */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <img
          src="/truck_2.png"
          alt="Truck"
          className={
            'absolute h-auto w-96 drop-shadow-2xl transition-transform duration-1000 ' +
            (phase === 'truck-in' ? 'notfound-truck-in' :
             phase === 'cart-in' || phase === 'pause' ? 'notfound-truck-center' :
             phase === 'truck-out' || phase === 'cart-out' ? 'notfound-truck-out' :
             '') + ' bottom-[calc(30%-64px)]'
          }
        />
        {/* Cart Animation */}
        <img
          src="/truck_1.png"
          alt="Cart"
          className={
            'absolute h-auto w-32 drop-shadow-xl transition-transform duration-1000 ' +
            (phase === 'cart-in' || phase === 'pause' ? 'notfound-cart-in' :
             phase === 'truck-out' ? 'notfound-cart-pause' :
             phase === 'cart-out' ? 'notfound-cart-out' :
             'notfound-cart-start') +
            (phase === 'cart-out' ? ' notfound-cart-flip' : '') + ' bottom-[calc(30%-64px)]'
          }
        />
      </div>

      {/* 404 Info and Logo, fade/slide in when vehicles are leaving */}
      <div className={`relative z-10 flex flex-col items-center justify-center min-h-screen px-6 pt-1 transition-all duration-700 ${showText ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8 pointer-events-none'}`}>
        <img
          src="/primepre-logo.png"
          alt="Prime Pre Logistics"
          className="w-48 h-auto mb-8"
        />
        <h1 className="text-8xl font-bold text-white drop-shadow-lg mb-4">404</h1>
        <h2 className="text-3xl font-bold text-white mb-3 drop-shadow-lg">Page Not Found</h2>
        <p className="text-white/90 text-lg drop-shadow-md mb-8 max-w-xl text-center">
          Looks like this shipment got lost in transit. Let's get you back on track.
        </p>
        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-4 mb-12">
          <button
            onClick={() => navigate('/')}
            className="h-12 px-8 text-lg rounded-lg bg-white text-primary font-semibold shadow hover:bg-primary/10 transition flex items-center justify-center"
          >
            <Home className="h-5 w-5 mr-2" />
            Go to Dashboard
          </button>
          <button
            onClick={() => navigate(-1)}
            className="h-12 px-8 text-lg rounded-lg border border-white text-white font-semibold shadow hover:bg-white/10 transition flex items-center justify-center"
          >
            <ArrowLeft className="h-5 w-5 mr-2" />
            Go Back
          </button>
        </div>
        <div className="mt-32 text-center text-white/80">
          <p className="text-sm">Need help? Contact our support team</p>
          <p className="text-sm mt-1">support@primepre.com</p>
        </div>
      </div>
      {/* Animations CSS */}
      <style>{`
        .notfound-truck-in {
          transform: translateX(-100vw);
          animation: truck-in 1.2s cubic-bezier(0.25,0.46,0.45,0.94) forwards;
        }
        @keyframes truck-in {
          to { transform: translateX(${TRUCK_STOP}); }
        }
        .notfound-truck-center {
          transform: translateX(${TRUCK_STOP});
        }
        .notfound-truck-out {
          transform: translateX(${TRUCK_STOP});
          animation: truck-out 0.8s cubic-bezier(0.4,0.8,0.6,1) forwards;
        }
        @keyframes truck-out {
          to { transform: translateX(100vw); }
        }
        .notfound-cart-start {
          transform: translateX(-120vw);
        }
        .notfound-cart-in {
          transform: translateX(-120vw);
          animation: cart-in 1.2s cubic-bezier(0.25,0.46,0.45,0.94) forwards;
        }
        @keyframes cart-in {
          to { transform: translateX(${CART_STOP}); }
        }
        .notfound-cart-pause {
          transform: translateX(${CART_STOP});
        }
        .notfound-cart-out {
          transform: translateX(${CART_STOP}) scaleX(1);
          animation: cart-out 1.2s cubic-bezier(0.4,0.8,0.6,1) forwards;
        }
        .notfound-cart-flip {
          transform: translateX(${CART_STOP}) scaleX(-1);
        }
        @keyframes cart-out {
          to { transform: translateX(-120vw) scaleX(-1); }
        }
      `}</style>
    </div>
  );
}
