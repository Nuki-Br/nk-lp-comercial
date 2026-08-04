import { Fragment } from "react";
import { ModuleSlide } from "./ModuleSlide";
import { ModuleDemoSlide } from "./ModuleDemoSlide";
import { modules } from "@/content/modules";

/**
 * Renderiza os 3 módulos (Planner, Personaliza, Inspetor) como slides estáticos
 * no padrão da apresentação comercial. Cada módulo pode emitir até DOIS slides:
 *   1. Descritivo (`#planner`, `#personaliza`, `#inspetor`) — sempre presente
 *   2. Demo interativa (`#planner-demo`, etc) — emitido só se `data.demoUrl` existe
 *
 * O progress-nav lateral só ancora nos ids "topic" (comercialNav intacto).
 * Os slides de demo passam despercebidos pelo observer da nav mas são navegáveis
 * via setas ← → globais (o ComercialScripts deriva a lista walkable do DOM).
 *
 * Home continua com JourneyModule intocado — a linguagem scrollytelling fica lá.
 */
export function ModuleSlides() {
  return (
    <>
      {modules.map((data, index) => (
        <Fragment key={data.id}>
          <ModuleSlide data={data} index={index} />
          {data.demoUrl && <ModuleDemoSlide data={data} />}
        </Fragment>
      ))}
    </>
  );
}
