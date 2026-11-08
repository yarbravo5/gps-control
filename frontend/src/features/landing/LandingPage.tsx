import { useEffect, useState } from "react";
import type { MouseEvent } from "react";
import { Link } from "react-router-dom";

import { useAuth } from "../auth/AuthProvider";
import { FleetHeroVisual } from "./FleetHeroVisual";

const benefits = [
  { title: "Ubicación GPS", description: "Consulta la ubicación reportada por el sistema de monitoreo." },
  { title: "Historial de posiciones", description: "Revisa recorridos y posiciones de periodos anteriores." },
  { title: "Personas vinculadas", description: "Organiza conductores y pasajeros asociados a vehículos." },
  { title: "Acceso por permisos", description: "Cada cuenta ve las opciones habilitadas para su operación." },
];

const features = [
  { number: "01", title: "Monitoreo de vehículos", description: "Consulta vehículos y su información de ubicación desde una vista organizada.", icon: "pin" },
  { number: "02", title: "Conductores y pasajeros", description: "Mantén relacionadas las personas con los vehículos que hacen parte de la operación.", icon: "people" },
  { number: "03", title: "Rutas e historial", description: "Explora posiciones anteriores para comprender los recorridos de la flota.", icon: "route" },
];

const solutions = [
  { title: "Transporte de carga", detail: "Tractomulas y vehículos pesados", type: "truck" },
  { title: "Flotas comerciales", detail: "Vehículos al servicio de tu operación", type: "van" },
  { title: "Equipos industriales", detail: "Maquinaria amarilla y equipos de trabajo", type: "equipment" },
] as const;

const steps = [
  { number: "1", title: "Conecta la flota", description: "GPS Control consulta la información disponible en la plataforma de monitoreo." },
  { number: "2", title: "Organiza los datos", description: "Relaciona vehículos, conductores y pasajeros según tu operación." },
  { number: "3", title: "Consulta el recorrido", description: "Accede a ubicación e historial desde una experiencia clara y adaptable." },
];

function BrandMark() {
  return <span aria-hidden="true" className="landing-brand-mark">G</span>;
}

function ScenarioIllustration({ type }: { type: "truck" | "van" | "equipment" }) {
  return <svg aria-hidden="true" className={`scenario-illustration scenario-illustration--${type}`} fill="none" viewBox="0 0 360 160" xmlns="http://www.w3.org/2000/svg">
    <path d="M18 127H342" stroke="#6B6B6B" strokeOpacity=".38" strokeWidth="2"/>
    <path d="M32 143H86M108 143H162M184 143H238M260 143H314" stroke="#6B6B6B" strokeOpacity=".25" strokeWidth="2" strokeDasharray="8 9"/>
    {type === "truck" ? <>
      <path d="M36 52H216V112H36Z" fill="#EEE8F2" stroke="#6B6B6B" strokeOpacity=".55" strokeWidth="2"/>
      <path d="M44 64H208V73H44Z" fill="#EB162C"/>
      <path d="M218 78H263C275 78 284 84 290 96L301 114H218Z" fill="#A81A2B"/>
      <path d="M232 84H261C269 84 275 88 280 97L287 106H232Z" fill="#1E8C93"/>
      <path d="M28 116H310" stroke="#6B6B6B" strokeWidth="5"/>
      <path d="M303 101H312V112H303Z" fill="#EB162C"/>
      <circle cx="76" cy="122" r="17" fill="#6B6B6B"/><circle cx="76" cy="122" r="7" fill="#EEE8F2"/>
      <circle cx="240" cy="122" r="17" fill="#6B6B6B"/><circle cx="240" cy="122" r="7" fill="#EEE8F2"/>
      <circle cx="284" cy="122" r="17" fill="#6B6B6B"/><circle cx="284" cy="122" r="7" fill="#EEE8F2"/>
    </> : null}
    {type === "van" ? <>
      <path d="M54 113V78C54 63 65 53 81 53H220C237 53 247 64 252 79L261 88H291C301 88 307 95 307 105V116H54Z" fill="#EEE8F2" stroke="#6B6B6B" strokeWidth="2"/>
      <path d="M72 65H207V91H72Z" fill="#FFFFFF" stroke="#6B6B6B" strokeOpacity=".35" strokeWidth="2"/>
      <path d="M215 64C231 64 240 73 245 88L247 91H215Z" fill="#1E8C93"/>
      <path d="M60 99H302V107H60Z" fill="#EB162C"/>
      <path d="M190 95V113M202 95V113" stroke="#A81A2B" strokeOpacity=".65" strokeWidth="2"/>
      <path d="M51 116H311" stroke="#6B6B6B" strokeWidth="5"/>
      <path d="M299 100H308V110H299Z" fill="#A81A2B"/>
      <circle cx="105" cy="122" r="17" fill="#6B6B6B"/><circle cx="105" cy="122" r="7" fill="#EEE8F2"/>
      <circle cx="267" cy="122" r="17" fill="#6B6B6B"/><circle cx="267" cy="122" r="7" fill="#EEE8F2"/>
    </> : null}
    {type === "equipment" ? <>
      <path d="M91 111C91 101 99 94 110 94H227C238 94 246 101 246 111V119H91Z" fill="#6B6B6B"/>
      <circle cx="111" cy="110" r="8" fill="#EEE8F2"/><circle cx="139" cy="110" r="8" fill="#EEE8F2"/><circle cx="167" cy="110" r="8" fill="#EEE8F2"/><circle cx="195" cy="110" r="8" fill="#EEE8F2"/><circle cx="225" cy="110" r="8" fill="#EEE8F2"/>
      <path d="M122 89H207V103H122Z" fill="#A81A2B"/>
      <path d="M132 87V61C132 54 138 49 145 49H180C189 49 195 56 195 64V91H132Z" fill="#EEE8F2" stroke="#6B6B6B" strokeWidth="2"/>
      <path d="M142 57H174C180 57 184 61 184 67V78H142Z" fill="#1E8C93"/>
      <path d="M204 91 230 78 247 58 259 65 244 90 218 105Z" fill="#EB162C" stroke="#A81A2B" strokeLinejoin="round" strokeWidth="3"/>
      <path d="m252 63 19-20 15 10-14 23-15-2Z" fill="#A81A2B" stroke="#6B6B6B" strokeLinejoin="round" strokeWidth="2"/>
      <path d="m272 43 18-8 10 9-13 9Z" fill="#EB162C"/>
      <path d="M100 121H239" stroke="#6B6B6B" strokeWidth="4"/>
    </> : null}
  </svg>;
}

function FeatureIcon({ icon }: { icon: string }) {
  const paths: Record<string, string> = {
    pin: "M24 8a8 8 0 0 0-8 8c0 6 8 14 8 14s8-8 8-14a8 8 0 0 0-8-8Zm0 11a3 3 0 1 1 0-6 3 3 0 0 1 0 6Z",
    people: "M20 25a6 6 0 1 0 0-12 6 6 0 0 0 0 12Zm-11 8c0-4 4-7 11-7s11 3 11 7v2H9v-2Zm22-15a5 5 0 1 0-2-10 7 7 0 0 1 0 10Zm-1 6c5 1 8 3 8 7v2h-7v-2c0-3-1-5-3-7h2Z",
    route: "M12 31a5 5 0 1 0 0-10 5 5 0 0 0 0 10Zm24-18a5 5 0 1 0 0-10 5 5 0 0 0 0 10ZM17 26c3-8 6-10 14-12l1 4c-7 1-9 3-11 9l-4-1Z",
  };
  return <svg aria-hidden="true" className="size-12 text-brand-teal" fill="currentColor" viewBox="0 0 48 48"><path d={paths[icon] ?? paths.pin}/></svg>;
}

export function LandingPage() {
  const { user, isLoading } = useAuth();
  const [isScrolled, setIsScrolled] = useState(false);
  const [activeSection, setActiveSection] = useState("inicio");
  const destination = user?.must_change_password ? "/change-password" : "/app";
  const actionLabel = user?.must_change_password ? "Actualizar contraseña" : "Ir al panel de control";
  const headerActionLabel = user?.must_change_password ? "Cambiar clave" : "Ir al panel";

  useEffect(() => {
    const sectionIds = ["inicio", "funcionalidades", "soluciones", "como-funciona"];
    const updateHeader = () => {
      setIsScrolled(window.scrollY > 8);
      const currentSection = sectionIds
        .filter((id) => (document.getElementById(id)?.getBoundingClientRect().top ?? Number.POSITIVE_INFINITY) <= 150)
        .at(-1);
      setActiveSection(currentSection ?? "inicio");
    };

    updateHeader();
    window.addEventListener("scroll", updateHeader, { passive: true });
    return () => window.removeEventListener("scroll", updateHeader);
  }, []);

  const closeMobileMenu = (event: MouseEvent<HTMLAnchorElement>) => {
    const menu = event.currentTarget.closest("details");
    if (menu) menu.open = false;
  };

  return <div className="landing-page">
    <a className="skip-link" href="#contenido">Saltar al contenido</a>
    <header className={`landing-header${isScrolled ? " landing-header--scrolled" : ""}`}>
        <div className="landing-container landing-header__inner">
        <a aria-label="GPS Control, volver al inicio" className="landing-logo" href="#inicio"><BrandMark/><span>GPS <strong>CONTROL</strong></span></a>
        <nav aria-label="Navegación pública" className="landing-nav landing-nav--desktop">
          <a aria-current={activeSection === "funcionalidades" ? "location" : undefined} className="landing-nav__link" href="#funcionalidades">Funcionalidades</a><a aria-current={activeSection === "soluciones" ? "location" : undefined} className="landing-nav__link" href="#soluciones">Soluciones</a><a aria-current={activeSection === "como-funciona" ? "location" : undefined} className="landing-nav__link" href="#como-funciona">Cómo funciona</a>
        </nav>
        <details className="landing-mobile-menu">
          <summary aria-label="Abrir o cerrar menú de navegación"><span aria-hidden="true">☰</span></summary>
          <nav aria-label="Navegación pública móvil"><a aria-current={activeSection === "funcionalidades" ? "location" : undefined} className="landing-nav__link" href="#funcionalidades" onClick={closeMobileMenu}>Funcionalidades</a><a aria-current={activeSection === "soluciones" ? "location" : undefined} className="landing-nav__link" href="#soluciones" onClick={closeMobileMenu}>Soluciones</a><a aria-current={activeSection === "como-funciona" ? "location" : undefined} className="landing-nav__link" href="#como-funciona" onClick={closeMobileMenu}>Cómo funciona</a></nav>
        </details>
        <div className="landing-header__action">
          {isLoading ? <span role="status">Verificando…</span> : user ? <Link className="landing-button landing-button--small" to={destination}>{headerActionLabel}</Link> : <Link className="landing-button landing-button--small" to="/login">Iniciar sesión</Link>}
        </div>
      </div>
    </header>

    <main id="contenido">
      <section aria-label="Presentación principal de GPS Control" className="landing-hero" id="inicio">
        <div className="landing-hero__inner">
          <div className="landing-hero__banner">
            <div className="landing-hero__layout">
              <div className="landing-hero__copy">
                <p className="landing-eyebrow"><span aria-hidden="true" className="landing-eyebrow__line"/>MONITOREO SATELITAL · GPS CONTROL</p>
                <h1>Tu flota, <span>bajo control.</span></h1>
                <p className="landing-hero__lead">Ubicación, recorridos y personas vinculadas a tu operación, en una plataforma creada para quienes mueven a Colombia.</p>
                <div className="landing-actions">
                  {isLoading ? <span role="status">Verificando sesión…</span> : user ? <Link className="landing-button" to={destination}>{actionLabel}<span aria-hidden="true"> →</span></Link> : <a className="landing-button" href="#funcionalidades">Explorar la plataforma<span aria-hidden="true"> →</span></a>}
                  <a className="landing-text-link" href="#como-funciona">Cómo funciona <span aria-hidden="true">↓</span></a>
                </div>
                <div className="landing-hero__note"><span aria-hidden="true">✦</span> Tecnología para una operación más visible y organizada.</div>
              </div>
              <div className="landing-hero__visual"><FleetHeroVisual/></div>
            </div>
            <div aria-label="Funciones principales" className="landing-benefits__grid" role="group">
              {benefits.map((benefit, index) => <article className="landing-benefit" key={benefit.title}><span aria-hidden="true" className="landing-benefit__index">0{index + 1}</span><div><h2>{benefit.title}</h2><p>{benefit.description}</p></div></article>)}
            </div>
          </div>
        </div>
        <div aria-hidden="true" className="landing-hero__curve"/>
      </section>

      <section aria-labelledby="features-heading" className="landing-section landing-container" id="funcionalidades">
        <div className="landing-section__heading"><p className="landing-eyebrow">Una operación conectada</p><h2 id="features-heading">La información que necesitas,<br/><span>sin perder de vista el camino.</span></h2></div>
        <div className="landing-features">
          {features.map((feature) => <article className="landing-feature" key={feature.number}><div className="landing-feature__top"><FeatureIcon icon={feature.icon}/><span>{feature.number}</span></div><h3>{feature.title}</h3><p>{feature.description}</p><a aria-label={`Conocer ${feature.title}`} className="landing-feature__arrow" href="#como-funciona">Conocer más <span aria-hidden="true">↗</span></a></article>)}
        </div>
      </section>

      <section aria-labelledby="solutions-heading" className="landing-solutions" id="soluciones">
        <div className="landing-container"><div className="landing-section__heading landing-section__heading--center"><p className="landing-eyebrow">Una solución para cada recorrido</p><h2 id="solutions-heading">Acompañamos a quienes <span>mueven el país.</span></h2><p>Una plataforma flexible para flotas y equipos que necesitan conocer su operación.</p></div>
          <div className="landing-solutions__grid">{solutions.map((solution) => <article className="landing-solution" key={solution.type}><div className="landing-solution__art">{solution.type === "van" ? <img alt="" aria-hidden="true" className="commercial-fleet-illustration" src="/images/commercial-fleet-car.svg"/> : <ScenarioIllustration type={solution.type}/>}</div><div className="landing-solution__copy"><h3>{solution.title}</h3><p>{solution.detail}</p></div></article>)}</div>
        </div>
      </section>

      <section aria-labelledby="process-heading" className="landing-process" id="como-funciona">
        <div className="landing-container landing-process__inner"><div className="landing-process__copy"><p className="landing-eyebrow">Información con contexto</p><h2 id="process-heading">De la señal GPS a una operación <span>más organizada.</span></h2><p>GPS Control reúne información de monitoreo y datos operativos para facilitar la consulta diaria de tu flota.</p><a className="landing-process__link" href="#soluciones">Ver soluciones para tu operación <span aria-hidden="true">↗</span></a></div>
          <ol className="landing-steps">{steps.map((step) => <li key={step.number}><span className="landing-step__number">{step.number}</span><div><h3>{step.title}</h3><p>{step.description}</p></div></li>)}</ol>
        </div>
      </section>

      <section className="landing-final-cta"><div className="landing-container landing-final-cta__inner"><div><p className="landing-eyebrow">GPS Control</p><h2>Haz visible cada parte de tu operación.</h2><p>Empieza con una vista más clara de tus vehículos, recorridos y equipo.</p></div>{isLoading ? <span role="status">Verificando sesión…</span> : user ? <Link className="landing-button landing-button--light" to={destination}>{actionLabel}<span aria-hidden="true"> →</span></Link> : <a className="landing-button landing-button--light" href="#funcionalidades">Explorar funcionalidades<span aria-hidden="true"> →</span></a>}</div></section>
    </main>

    <footer className="landing-footer"><div className="landing-container landing-footer__main"><a aria-label="GPS Control, volver al inicio" className="landing-logo landing-logo--footer" href="#inicio"><BrandMark/><span>GPS <strong>CONTROL</strong></span></a><p>Monitoreo satelital y gestión de flotas para una operación más organizada.</p><nav aria-label="Enlaces del pie de página"><a href="#funcionalidades">Funcionalidades</a><a href="#soluciones">Soluciones</a><a href="#como-funciona">Cómo funciona</a></nav></div><div className="landing-container landing-footer__bottom"><span>© {new Date().getFullYear()} GPS Control</span><a href="#inicio">Volver arriba ↑</a></div></footer>
  </div>;
}
