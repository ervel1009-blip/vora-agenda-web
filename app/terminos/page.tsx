export default function TermsPage() {
  return (
    <div className="max-w-4xl mx-auto py-20 px-6 font-sans text-slate-800">
      <h1 className="text-4xl font-bold mb-8 text-slate-900">Términos y Condiciones de Uso</h1>
      <p className="mb-6 text-slate-500 italic">Última revisión: 17 de abril de 2026</p>

      <section className="mb-10">
        <h2 className="text-2xl font-semibold mb-4 text-slate-900">1. Relación Contractual</h2>
        <p className="leading-relaxed">
          Los presentes términos regulan el acceso y uso de la plataforma <strong>VORA Suite</strong>, propiedad de <strong>Artemix S.A.</strong>, legalmente constituida en Guatemala. Al utilizar este servicio, el usuario acepta quedar vinculado por estos términos.
        </p>
      </section>

      <section className="mb-10">
        <h2 className="text-2xl font-semibold mb-4 text-slate-900">2. Descripción de los Planes y Pagos</h2>
        <p className="leading-relaxed mb-4">
          VORA Suite ofrece diversos planes de suscripción que pueden variar en funciones y precio. Actualmente:
        </p>
        <ul className="list-disc ml-6 space-y-2 mb-4">
          <li><strong>Plan Starter:</strong> Incluye gestión de agenda e IA por un costo mensual de $19.99.</li>
          <li><strong>Periodo de Prueba:</strong> Los nuevos usuarios cuentan con 30 días de prueba gratuita.</li>
        </ul>
        <p className="leading-relaxed text-slate-600 italic">
          Artemix S.A. se reserva el derecho de modificar los precios o crear nuevos planes (Pro, Premium, etc.) previa notificación a los usuarios activos.
        </p>
      </section>

      <section className="mb-10">
        <h2 className="text-2xl font-semibold mb-4 text-slate-900">3. Uso de la Inteligencia Artificial</h2>
        <p className="leading-relaxed">
          VORA utiliza modelos de lenguaje avanzados para interactuar por WhatsApp. Aunque nos esforzamos por la precisión, el usuario reconoce que la IA puede generar respuestas imprecisas. Es responsabilidad del usuario supervisar el entrenamiento y la configuración del asistente.
        </p>
      </section>

      <section className="mb-10">
        <h2 className="text-2xl font-semibold mb-4 text-slate-900">4. Limitación de Responsabilidad</h2>
        <p className="leading-relaxed">
          Artemix S.A. no se hace responsable por pérdidas de ingresos, citas no agendadas o errores técnicos derivados de fallas en servicios de terceros (como Google Calendar o WhatsApp). Nuestra responsabilidad se limita al monto pagado por el usuario en el último mes de servicio.
        </p>
      </section>

      <section className="mb-10">
        <h2 className="text-2xl font-semibold mb-4 text-slate-900">5. Propiedad Intelectual</h2>
        <p className="leading-relaxed">
          Todo el software, diseños, logos y algoritmos de VORA Suite son propiedad exclusiva de Artemix S.A.. Queda prohibida la reproducción o ingeniería inversa de la plataforma.
        </p>
      </section>

      <section className="mb-10">
        <h2 className="text-2xl font-semibold mb-4 text-slate-900">6. Ley Aplicable</h2>
        <p className="leading-relaxed">
          Estos términos se rigen por las leyes de la República de Guatemala. Cualquier controversia será resuelta ante los tribunales competentes de dicho país.
        </p>
      </section>

      <footer className="mt-20 pt-10 border-t border-slate-100 text-sm text-slate-400 text-center">
        Artemix S.A. - Guatemala.
      </footer>
    </div>
  );
}