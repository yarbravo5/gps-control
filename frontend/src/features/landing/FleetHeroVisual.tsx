type WheelProps = {
  cx: number;
  axle: string;
};

function Wheel({ cx, axle }: WheelProps) {
  return (
    <g
      className="fleet-wheel"
      data-axle={axle}
      data-center={`${cx},354`}
      data-radius="31"
      transform={`translate(${cx} 354)`}
    >
      <ellipse cx="0" cy="38" rx="35" ry="5" fill="#17232B" opacity=".18" />
      <g className="fleet-wheel-spin">
        <circle r="31" fill="#171B1F" />
        <circle r="25" fill="none" stroke="#343A40" strokeWidth="2" />
        <circle r="18" fill="#BEC5CA" stroke="#7F888E" strokeWidth="2" />
        <circle r="13" fill="#E4E8EA" stroke="#A4ADB2" strokeWidth="1.5" />
        <path d="M0-11V11M-11 0h22M-8-8 8 8M8-8-8 8" stroke="#8B949A" strokeWidth="2" />
        <circle r="5" fill="#EB162C" />
      </g>
    </g>
  );
}

const rearWheelPositions = [
  { cx: 518, axle: "rear-front-1" },
  { cx: 582, axle: "rear-front-2" },
  { cx: 646, axle: "rear-front-3" },
  { cx: 770, axle: "rear-back-1" },
  { cx: 834, axle: "rear-back-2" },
  { cx: 898, axle: "rear-back-3" },
];

const wheelArchPath = (cx: number) => `M${cx - 36} 354A36 36 0 0 1 ${cx + 36} 354`;

export function FleetHeroVisual() {
  return (
    <div
      aria-label="Tractomula blanca de carga pesada vista de lado, con dos grupos de tres ruedas traseras"
      className="fleet-visual"
      role="img"
    >
      <svg
        aria-hidden="true"
        className="fleet-visual__art"
        fill="none"
        preserveAspectRatio="xMidYMid meet"
        viewBox="0 0 1200 500"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <linearGradient id="fleet-trailer-fill" x1="350" x2="935" y1="120" y2="312" gradientUnits="userSpaceOnUse">
            <stop stopColor="#FFFFFF" />
            <stop offset="1" stopColor="#E7EBED" />
          </linearGradient>
          <linearGradient id="fleet-cab-fill" x1="95" x2="365" y1="145" y2="333" gradientUnits="userSpaceOnUse">
            <stop stopColor="#FFFFFF" />
            <stop offset="1" stopColor="#DDE3E6" />
          </linearGradient>
        </defs>

        {/* A narrow road strip gives the tire contact points a clear visual base. */}
        <g className="fleet-road" aria-hidden="true">
          <path d="M24 385C315 381 866 381 1176 386V421C868 417 316 419 24 425V385Z" fill="#AEB8BE" opacity=".9" />
          <path d="M24 386C315 382 866 382 1176 387M24 421C316 415 868 415 1176 419" stroke="#879298" strokeOpacity=".72" strokeWidth="2" />
          <path className="fleet-road-markings" d="M24 402H1176" stroke="#FFFFFF" strokeDasharray="18 28" strokeLinecap="round" strokeWidth="4" />
          <path className="fleet-gps-route" d="M24 416C325 410 865 410 1176 414" stroke="#1E8C93" strokeDasharray="2 18" strokeLinecap="round" strokeOpacity=".45" strokeWidth="2" />
        </g>

        <g className="fleet-vehicle-motion">
          <ellipse cx="593" cy="399" rx="463" ry="15" fill="#1B2530" opacity=".13" />

          {/* Shortened cargo body, keeping the same profile and corporate stripe. */}
          <g className="fleet-trailer">
            <path d="M354 105H901C918 105 932 119 932 136V312H354V105Z" fill="url(#fleet-trailer-fill)" stroke="#AEB8BE" strokeWidth="3" />
            <path d="M359 228H928V255H359V228Z" fill="#EB162C" />
            <path d="M360 234H928" stroke="#FF8792" strokeWidth="3" />
            <path d="M384 120V215M438 120V215M492 120V215M546 120V215M600 120V215M654 120V215M708 120V215M762 120V215M816 120V215M870 120V215" stroke="#C8D0D4" strokeOpacity=".52" strokeWidth="2" />
            <path d="M355 292H930" stroke="#CBD2D6" strokeWidth="3" />
            <path d="M909 110V307" stroke="#D5DBDE" strokeWidth="5" />
            <path d="M922 270H932V306H922Z" fill="#A81A2B" />
          </g>

          {/* The trailer runs into the tractor on one straight, continuous frame. */}
          <g className="fleet-chassis">
            <path d="M120 314H940V333H120Z" fill="#707B82" />
            <path d="M120 314H940" stroke="#D8DEE1" strokeWidth="4" />
            <path d="M120 333H940" stroke="#3C454B" strokeWidth="3" />
            <path d="M330 306H377V334H330Z" fill="#4D585F" />
            <path d="M340 306Q356 292 375 306L391 314H340Z" fill="#7D888E" stroke="#4B555B" strokeWidth="2" />
            <path d="M113 336H946" stroke="#879197" strokeWidth="5" />
          </g>

          {/* One simple side-view cab with petroleum glass and restrained details. */}
          <g className="fleet-cab">
            <path d="M88 310V237C88 222 92 208 101 195L139 145C149 132 164 125 181 125H273C301 125 321 141 333 168L354 221V314H115C100 314 88 311 88 310Z" fill="url(#fleet-cab-fill)" stroke="#89959B" strokeLinejoin="round" strokeWidth="3" />
            <path d="M153 148C160 139 169 135 181 135H271C292 135 306 148 315 169L329 205H130L153 148Z" fill="#123747" />
            <path d="M169 144H267C284 144 295 153 303 171L315 196H137L157 153C160 147 164 144 169 144Z" fill="#174354" />
            <path d="M252 138V199" stroke="#A6B4BA" strokeWidth="4" />
            <path d="M144 215H332V288H105V239C105 230 108 222 114 215H144Z" fill="#F7F9FA" stroke="#C5CDD1" strokeWidth="2" />
            <path d="M98 235H126V291H98Z" fill="#D7DEE2" stroke="#AEB8BD" strokeWidth="2" />
            <path d="M100 245H119V281H100Z" fill="#202A30" />
            <path d="M99 291H129V303H99Z" fill="#EB162C" />
            <path d="M95 304H139V319H95Q86 319 86 312V311Q86 304 95 304Z" fill="#747F85" />
            <path d="M88 311H145" stroke="#D8DEE1" strokeWidth="3" />
            <path d="M328 220H340L351 247" fill="none" stroke="#647078" strokeLinecap="round" strokeWidth="5" />
            <path d="M336 217 349 212 354 223 342 229Z" fill="#173A49" stroke="#69767C" strokeWidth="2" />
            <path d="M106 200 92 194 80 207M100 200 91 220" fill="none" stroke="#526069" strokeLinecap="round" strokeWidth="4" />
            <path d="M75 202 91 201 93 212 77 214Z" fill="#173A49" stroke="#69767C" strokeWidth="2" />
            <path d="M333 261H350V281H333Z" fill="#F8FAFA" stroke="#9DA8AD" strokeWidth="2" />
            <path d="M342 266H349V276H342Z" fill="#EB162C" />
            <path d="M312 283H328" stroke="#66737A" strokeLinecap="round" strokeWidth="4" />
            <path d="M303 284H314" stroke="#A81A2B" strokeLinecap="round" strokeWidth="3" />
            <path d="M274 314H323" stroke="#AFB9BE" strokeWidth="3" />
          </g>

          {/* Six equal rear wheels form two separated groups of three. */}
          <g className="fleet-rear-wheels" aria-hidden="true">
            {rearWheelPositions.map(({ cx, axle }) => <Wheel axle={axle} cx={cx} key={axle} />)}
          </g>

          {/* The cab has its two front wheels; every tire touches the same road line. */}
          <g className="fleet-front-wheels" aria-hidden="true">
            <Wheel axle="front-far" cx={188} />
            <Wheel axle="front-near" cx={238} />
          </g>

          <g className="fleet-fenders" fill="none" strokeLinecap="round">
            <path d={wheelArchPath(188)} stroke="#AEB8BE" strokeWidth="7" />
            <path d={wheelArchPath(238)} stroke="#AEB8BE" strokeWidth="7" />
            {rearWheelPositions.map(({ cx, axle }) => <path d={wheelArchPath(cx)} key={`arch-${axle}`} stroke="#879298" strokeWidth="6" />)}
          </g>
        </g>
      </svg>
    </div>
  );
}
