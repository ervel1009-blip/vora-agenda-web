export default function PrivacyPage() {
  return (
    <div className="max-w-4xl mx-auto py-20 px-6 font-sans text-slate-800">
      <h1 className="text-4xl font-bold mb-8">Política de Privacidad</h1>
      <p className="mb-6 text-slate-500">Última actualización: 17 de abril de 2026</p>

      <section className="mb-10">
        <h2 className="text-2xl font-semibold mb-4 text-slate-900">1. Información General</h2>
        <p className="leading-relaxed">
          VORA Suite es una plataforma desarrollada por <strong>Artemix S.A.</strong>, con sede en Guatemala. Esta política describe cómo recolectamos y utilizamos sus datos al usar nuestros servicios de gestión y agendamiento.
        </p>
      </section>

      <section className="mb-10">
        <h2 className="text-2xl font-semibold mb-4 text-slate-900">2. Uso de Datos de Google (Google Calendar)</h2>
        <p className="leading-relaxed mb-4">
          Nuestra aplicación solicita acceso a su cuenta de Google para gestionar su calendario profesional. Los permisos específicos incluyen:
        </p>
        <ul className="list-disc ml-6 space-y-2">
          <li><strong>Lectura de eventos:</strong> Para identificar espacios disponibles en su agenda.</li>
          <li><strong>Escritura y Edición:</strong> Para crear nuevas citas generadas a través de su asistente de WhatsApp y reprogramarlas si es necesario.</li>
        </ul>
        <p className="mt-4 font-medium text-rose-600">
          VORA Suite no almacena, comparte, ni utiliza sus datos de calendario para fines publicitarios.
        </p>
      </section>

      <section className="mb-10">
        <h2 className="text-2xl font-semibold mb-4 text-slate-900">3. Protección de Datos</h2>
        <p className="leading-relaxed">
          Utilizamos protocolos de seguridad avanzados para asegurar que sus tokens de acceso estén cifrados. Usted puede revocar el acceso de VORA Suite a su cuenta de Google en cualquier momento desde su panel de seguridad de Google.
        </p>
      </section>

      <footer className="mt-20 pt-10 border-t border-slate-100 text-sm text-slate-400 text-center">
        © 2026 Artemix S.A. | Contacto: ervel.10.09@gmail.com
      </footer>
    </div>
  );
}