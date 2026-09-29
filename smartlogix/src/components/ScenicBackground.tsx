import React from 'react';

/**
 * ScenicBackground
 * 
 * Multi-layer premium 3D logistics world background:
 * - Base layer: warm ivory & cream atmospheric gradients with soft mist
 * - Distant layer: rolling sage-green mountain silhouettes & subtle topographic contour lines
 * - Scenic landscape layer: blended isometric miniature world with roads, solar hubs & trees
 * - Middle & foreground vector layer: winding logistics corridors, glowing sage/lime route lines,
 *   hub markers with pulse beacons, miniature isometric delivery trucks & EV vans
 * - Vignette & atmospheric mist: ensures high contrast & readability for foreground UI panels
 */
export const ScenicBackground: React.FC = () => {
  return (
    <div 
      aria-hidden="true"
      className="fixed inset-0 pointer-events-none select-none overflow-hidden z-0"
      style={{
        backgroundColor: '#FAF8F5',
      }}
    >
      {/* LAYER 1: Base Atmospheric Gradients & Warm Ivory Ambient Glow */}
      <div 
        className="absolute inset-0"
        style={{
          backgroundImage: `
            radial-gradient(circle at 18% 12%, rgba(209, 226, 212, 0.45) 0%, transparent 45%),
            radial-gradient(circle at 85% 18%, rgba(240, 232, 215, 0.6) 0%, transparent 50%),
            radial-gradient(circle at 50% 88%, rgba(216, 230, 219, 0.4) 0%, transparent 55%),
            radial-gradient(circle at 92% 82%, rgba(19, 59, 45, 0.04) 0%, transparent 40%)
          `
        }}
      />

      {/* LAYER 2: Scenic Landscape Render Backdrop (Miniature 3D Logistics World) */}
      <div 
        className="absolute inset-0 transition-opacity duration-1000"
        style={{
          backgroundImage: `url('/images/smartlogix/scenic-landscape.jpg')`,
          backgroundSize: 'cover',
          backgroundPosition: 'center 32%',
          opacity: 0.38,
          mixBlendMode: 'multiply',
          maskImage: `
            radial-gradient(ellipse 95% 80% at 50% 45%, rgba(0,0,0,0.2) 0%, rgba(0,0,0,0.5) 50%, rgba(0,0,0,0.85) 85%, black 100%),
            linear-gradient(to bottom, rgba(0,0,0,0.9) 0%, transparent 18%, transparent 75%, rgba(0,0,0,0.9) 100%)
          `,
          WebkitMaskImage: `
            radial-gradient(ellipse 90% 75% at 50% 40%, rgba(0,0,0,0.25) 0%, rgba(0,0,0,0.6) 55%, black 100%)
          `,
          filter: 'contrast(102%) saturate(95%)'
        }}
      />

      {/* LAYER 3: Topographic Contours & Rolling Sage Mountain Meshes (Scalable Vector) */}
      <svg 
        className="absolute inset-0 w-full h-full text-brand-primary opacity-30" 
        xmlns="http://www.w3.org/2000/svg"
        preserveAspectRatio="none"
        viewBox="0 0 1600 1000"
      >
        <defs>
          <linearGradient id="hillGrad1" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#C4D7C7" stopOpacity="0.45" />
            <stop offset="100%" stopColor="#8A9E8F" stopOpacity="0.1" />
          </linearGradient>
          <linearGradient id="hillGrad2" x1="100%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#D5E4D8" stopOpacity="0.5" />
            <stop offset="100%" stopColor="#A3BCA6" stopOpacity="0.15" />
          </linearGradient>
          <linearGradient id="routeGlowGrad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#10B981" stopOpacity="0.2" />
            <stop offset="50%" stopColor="#34D399" stopOpacity="0.85" />
            <stop offset="100%" stopColor="#059669" stopOpacity="0.3" />
          </linearGradient>
          <filter id="softGlow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>
          <style>{`
            @keyframes routePulseAnim {
              0% { stroke-dashoffset: 0; }
              100% { stroke-dashoffset: -36; }
            }
            .route-pulse-track {
              animation: routePulseAnim 12s linear infinite;
            }
            @media (prefers-reduced-motion: reduce) {
              .route-pulse-track {
                animation: none !important;
              }
            }
          `}</style>
        </defs>

        {/* Distant soft rolling hill waves - Upper edges */}
        <path 
          d="M0,180 C260,110 520,240 840,160 C1160,80 1380,210 1600,130 L1600,0 L0,0 Z" 
          fill="url(#hillGrad1)" 
        />
        <path 
          d="M0,260 C320,190 640,310 980,220 C1300,140 1480,260 1600,200 L1600,0 L0,0 Z" 
          fill="url(#hillGrad2)" 
          opacity="0.6"
        />

        {/* Topographic Contour Lines across Landscape Periphery */}
        <g stroke="#7F9885" strokeWidth="1" fill="none" opacity="0.45" strokeDasharray="3,4">
          {/* Top-right contours */}
          <path d="M1100,20 C1250,70 1420,50 1600,105" />
          <path d="M1150,50 C1280,100 1440,80 1600,140" />
          <path d="M1200,85 C1320,135 1470,115 1600,175" />
          <path d="M1260,120 C1370,170 1510,150 1600,210" />

          {/* Bottom-left contours */}
          <path d="M0,780 C180,740 320,840 520,810 C680,790 820,860 980,840" />
          <path d="M0,830 C190,790 340,885 540,860 C710,835 850,910 1020,885" />
          <path d="M0,880 C210,840 360,935 560,905 C730,880 870,950 1050,930" />
          <path d="M0,930 C220,890 380,980 580,955 C760,930 900,990 1090,975" />
        </g>

        {/* LAYER 4: Logistics Road Corridors & Connected Route Paths */}
        {/* Road 1: Northern Trans-Hub Highway */}
        <path 
          d="M-50,220 C220,290 410,150 720,240 C1020,320 1280,180 1650,250" 
          stroke="#E5DEC9" 
          strokeWidth="10" 
          fill="none" 
          strokeLinecap="round" 
          opacity="0.8" 
        />
        <path 
          className="route-pulse-track"
          d="M-50,220 C220,290 410,150 720,240 C1020,320 1280,180 1650,250" 
          stroke="#34D399" 
          strokeWidth="2.5" 
          fill="none" 
          strokeDasharray="8,10" 
          filter="url(#softGlow)"
          opacity="0.9"
        />

        {/* Road 2: Southern Cross-Regional Freight Route */}
        <path 
          d="M-30,720 C260,650 480,790 820,700 C1140,620 1380,760 1650,680" 
          stroke="#E5DEC9" 
          strokeWidth="9" 
          fill="none" 
          strokeLinecap="round" 
          opacity="0.75" 
        />
        <path 
          className="route-pulse-track"
          d="M-30,720 C260,650 480,790 820,700 C1140,620 1380,760 1650,680" 
          stroke="#10B981" 
          strokeWidth="2" 
          fill="none" 
          strokeDasharray="6,8" 
          opacity="0.8" 
        />

        {/* Connecting Arterial Link - Diagonal Route */}
        <path 
          d="M240,285 C290,440 420,530 520,760" 
          stroke="#EAE4D5" 
          strokeWidth="6" 
          fill="none" 
          strokeLinecap="round" 
          opacity="0.6" 
        />
        <path 
          d="M240,285 C290,440 420,530 520,760" 
          stroke="#6EE7B7" 
          strokeWidth="1.8" 
          fill="none" 
          strokeDasharray="4,6" 
          opacity="0.7" 
        />

        <path 
          d="M1250,200 C1180,380 1220,520 1160,650" 
          stroke="#EAE4D5" 
          strokeWidth="6" 
          fill="none" 
          strokeLinecap="round" 
          opacity="0.6" 
        />
        <path 
          d="M1250,200 C1180,380 1220,520 1160,650" 
          stroke="#6EE7B7" 
          strokeWidth="1.8" 
          fill="none" 
          strokeDasharray="4,6" 
          opacity="0.7" 
        />

        {/* LOGISTICS NODES & HUBS WITH PULSE RINGS */}
        {/* Hub Alpha - Western Junction */}
        <g transform="translate(240, 285)">
          <circle r="14" fill="#34D399" fillOpacity="0.2" className="animate-ping" style={{ animationDuration: '3s' }} />
          <circle r="7" fill="#133B2D" stroke="#FFFFFF" strokeWidth="2" />
          <circle r="2.5" fill="#34D399" />
          <text x="14" y="4" fill="#133B2D" fontSize="10" fontWeight="700" fontFamily="sans-serif" opacity="0.75" letterSpacing="0.5">HUB 01 · VALLEY</text>
        </g>

        {/* Hub Beta - Northern Summit Terminal */}
        <g transform="translate(720, 240)">
          <circle r="16" fill="#10B981" fillOpacity="0.15" className="animate-ping" style={{ animationDuration: '4s' }} />
          <circle r="8" fill="#133B2D" stroke="#FFFFFF" strokeWidth="2.5" />
          <circle r="3" fill="#6EE7B7" />
          <text x="15" y="4" fill="#133B2D" fontSize="10" fontWeight="700" fontFamily="sans-serif" opacity="0.75" letterSpacing="0.5">CENTRAL INTERCHANGE</text>
        </g>

        {/* Hub Gamma - Eastern Inland Depot */}
        <g transform="translate(1250, 200)">
          <circle r="14" fill="#34D399" fillOpacity="0.2" className="animate-ping" style={{ animationDuration: '3.5s' }} />
          <circle r="7" fill="#133B2D" stroke="#FFFFFF" strokeWidth="2" />
          <circle r="2.5" fill="#34D399" />
          <text x="14" y="4" fill="#133B2D" fontSize="10" fontWeight="700" fontFamily="sans-serif" opacity="0.75" letterSpacing="0.5">HUB 03 · PLATEAU</text>
        </g>

        {/* Hub Delta - Southern Railhead */}
        <g transform="translate(820, 700)">
          <circle r="14" fill="#34D399" fillOpacity="0.2" className="animate-ping" style={{ animationDuration: '4.5s' }} />
          <circle r="7" fill="#133B2D" stroke="#FFFFFF" strokeWidth="2" />
          <circle r="2.5" fill="#34D399" />
          <text x="14" y="4" fill="#133B2D" fontSize="10" fontWeight="700" fontFamily="sans-serif" opacity="0.75" letterSpacing="0.5">SOUTH MARSHALLING</text>
        </g>

        {/* ISOMETRIC MINIATURE DELIVERY TRUCKS ON ROADS */}
        {/* Truck 1: Traveling along northern highway near x=480, y=190 */}
        <g transform="translate(480, 185) scale(0.9) rotate(8)">
          {/* Shadow */}
          <ellipse cx="14" cy="18" rx="20" ry="7" fill="#133B2D" fillOpacity="0.18" />
          {/* Container body (Cream / Brand Soft) */}
          <polygon points="4,4 28,-7 36,4 12,15" fill="#F4F0E6" stroke="#D1C7B3" strokeWidth="0.8" />
          <polygon points="4,4 12,15 12,24 4,13" fill="#E6DFD1" />
          <polygon points="12,15 36,4 36,13 12,24" fill="#DDD4C4" />
          {/* Cab (Forest Green) */}
          <polygon points="-6,10 4,4 12,15 2,21" fill="#133B2D" />
          <polygon points="-6,10 2,21 2,26 -6,15" fill="#0E2E23" />
          <polygon points="2,21 12,15 12,20 2,26" fill="#1B4D3C" />
          {/* Cab Windshield (Ice Blue Glass) */}
          <polygon points="-3,11 3,7 7,12 1,16" fill="#A7F3D0" opacity="0.85" />
          {/* Wheels */}
          <ellipse cx="-1" cy="24" rx="2.5" ry="3.5" fill="#2D3748" />
          <ellipse cx="20" cy="21" rx="2.5" ry="3.5" fill="#2D3748" />
          <ellipse cx="28" cy="17" rx="2.5" ry="3.5" fill="#2D3748" />
        </g>

        {/* Truck 2: Traveling along northern highway near x=1050, y=265 */}
        <g transform="translate(1040, 260) scale(0.85) rotate(-12)">
          {/* Shadow */}
          <ellipse cx="14" cy="18" rx="19" ry="6.5" fill="#133B2D" fillOpacity="0.16" />
          {/* Container body (Forest Green) */}
          <polygon points="4,4 28,-7 36,4 12,15" fill="#1B4D3C" stroke="#133B2D" strokeWidth="0.8" />
          <polygon points="4,4 12,15 12,23 4,12" fill="#133B2D" />
          <polygon points="12,15 36,4 36,12 12,23" fill="#0E2E23" />
          {/* SmartLogix accent stripe on container */}
          <line x1="8" y1="12" x2="32" y2="2" stroke="#34D399" strokeWidth="1.5" />
          {/* Cab (Cream / White) */}
          <polygon points="-6,10 4,4 12,15 2,21" fill="#FAF8F5" />
          <polygon points="-6,10 2,21 2,25 -6,14" fill="#E2E4DC" />
          <polygon points="2,21 12,15 12,19 2,25" fill="#F4F0E6" />
          {/* Wheels */}
          <ellipse cx="-1" cy="23" rx="2.2" ry="3" fill="#2D3748" />
          <ellipse cx="19" cy="20" rx="2.2" ry="3" fill="#2D3748" />
        </g>

        {/* Truck 3: Small EV Delivery Van near southern route x=380, y=695 */}
        <g transform="translate(380, 690) scale(0.75) rotate(16)">
          <ellipse cx="10" cy="14" rx="15" ry="5.5" fill="#133B2D" fillOpacity="0.18" />
          {/* Van body */}
          <polygon points="0,2 20,-6 26,2 6,10" fill="#FFFFFF" stroke="#D8E2DC" strokeWidth="0.8" />
          <polygon points="0,2 6,10 6,17 0,9" fill="#E8ECE9" />
          <polygon points="6,10 26,2 26,9 6,17" fill="#F0F4F1" />
          {/* Green EV Accent band */}
          <polygon points="3,6 18,-1 20,1 5,8" fill="#10B981" />
          {/* Wheels */}
          <ellipse cx="2" cy="14" rx="2" ry="2.8" fill="#333" />
          <ellipse cx="18" cy="8" rx="2" ry="2.8" fill="#333" />
        </g>

        {/* SCATTERED ISOMETRIC TREE CLUSTERS (Sage & Forest Green) */}
        {/* Tree Cluster 1: near top left */}
        <g transform="translate(180, 160)">
          <ellipse cx="10" cy="16" rx="9" ry="4" fill="#133B2D" fillOpacity="0.14" />
          {/* Tree 1 */}
          <polygon points="10,0 3,14 17,14" fill="#2D6A4F" />
          <polygon points="10,-4 5,8 15,8" fill="#40916C" />
          <polygon points="10,-8 6,2 14,2" fill="#52B788" />
          {/* Tree 2 */}
          <polygon points="20,4 15,16 25,16" fill="#1B4332" />
          <polygon points="20,0 16,10 24,10" fill="#2D6A4F" />
        </g>

        {/* Tree Cluster 2: near right edge */}
        <g transform="translate(1380, 240)">
          <ellipse cx="12" cy="18" rx="12" ry="5" fill="#133B2D" fillOpacity="0.15" />
          <polygon points="12,2 5,16 19,16" fill="#1B4332" />
          <polygon points="12,-2 7,10 17,10" fill="#2D6A4F" />
          <polygon points="22,6 17,18 27,18" fill="#40916C" />
          <polygon points="22,1 18,11 26,11" fill="#52B788" />
        </g>

        {/* Tree Cluster 3: bottom right periphery */}
        <g transform="translate(1420, 720)">
          <ellipse cx="14" cy="18" rx="14" ry="6" fill="#133B2D" fillOpacity="0.15" />
          <polygon points="12,0 4,16 20,16" fill="#2D6A4F" />
          <polygon points="12,-5 6,8 18,8" fill="#40916C" />
          <polygon points="24,4 18,17 30,17" fill="#1B4332" />
        </g>
      </svg>

      {/* LAYER 5: Soft Atmospheric Mist & Center Content Contrast Shield */}
      <div 
        className="absolute inset-0"
        style={{
          background: `
            radial-gradient(ellipse 70% 65% at 50% 48%, rgba(250, 248, 245, 0.88) 0%, rgba(250, 248, 245, 0.65) 55%, rgba(250, 248, 245, 0.15) 100%),
            linear-gradient(to bottom, rgba(250, 248, 245, 0.8) 0%, transparent 12%, transparent 88%, rgba(250, 248, 245, 0.85) 100%)
          `
        }}
      />
    </div>
  );
};
