export default function TermsPage() {
  return (
    <div className="max-w-4xl mx-auto py-20 px-6 font-sans text-slate-800">
      <h1 className="text-4xl font-bold mb-8">Términos y Condiciones</h1>
      
      <section className="mb-10">
        <h2 className="text-2xl font-semibold mb-4 text-slate-900">1. Aceptación del Servicio</h2>
        <p className="leading-relaxed">
          Al registrarse en VORA Suite, usted acepta los servicios de gestión de negocios y asistente virtual proporcionados por Artemix S.A..
        </p>
      </section>

      <section className="mb-10">
        <h2 className="text-2xl font-semibold mb-4 text-slate-900">2. Suscripciones y Pagos</h2>
        <p className="leading-relaxed">
          Ofrecemos un Plan Starter con un periodo de prueba gratuito de 30 días. Al finalizar el periodo de prueba, se realizará el cobro mensual automático de $19.99. Usted puede cancelar su suscripción en cualquier momento desde su panel de configuración.
        </p>
      </section>

      <section className="mb-10">
        <h2 className="text-2xl font-semibold mb-4 text-slate-900">3. Responsabilidad</h2>
        <p className="leading-relaxed">
          VORA Suite actúa como un facilitador tecnológico. El usuario es responsable de la veracidad de la información de sus servicios y la atención final a sus clientes.
        </p>
      </section>

      <footer className="mt-20 pt-10 border-t border-slate-100 text-sm text-slate-400 text-center">
        Artemix S.A. - Ciudad de Guatemala
      </footer>
    </div>
  );
}