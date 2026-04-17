'use client'

interface OnboardingProgressProps {
  currentStep: number
}

export default function OnboardingProgress({ currentStep }: OnboardingProgressProps) {
  const steps = [
    { id: 1, label: 'GIRO' },
    { id: 2, label: 'CALENDARIO' },
    { id: 3, label: 'PERFIL' },
    { id: 4, label: 'HORARIOS' },
    { id: 5, label: 'SERVICIOS' },
    { id: 6, label: 'PLANES' },
    { id: 7, label: 'PAGO' }
  ];

  return (
    <div className="max-w-3xl w-full mx-auto mb-10 px-4">
      <div className="flex items-center justify-between relative">
        {/* Línea de fondo neutra */}
        <div className="absolute top-1/2 left-0 w-full h-0.5 bg-slate-100 -translate-y-1/2 z-0"></div>
        
        {steps.map((step) => {
          const isCompleted = currentStep > step.id;
          const isCurrent = currentStep === step.id;

          return (
            <div key={step.id} className="relative z-10 flex flex-col items-center">
              <div className={`w-7 h-7 md:w-9 md:h-9 rounded-full flex items-center justify-center font-black text-[10px] md:text-xs transition-all duration-500 ${
                isCompleted 
                ? 'bg-rose-100 text-rose-700 border border-rose-200 shadow-sm' 
                : isCurrent 
                ? 'bg-rose-700 text-white shadow-xl shadow-slate-200 ring-4 ring-rose-50' 
                : 'bg-white text-slate-300 border border-slate-100'
              }`}>
                {isCompleted ? '✓' : step.id}
              </div>
              <span className={`text-[8px] md:text-[9px] mt-2 font-black uppercase tracking-widest hidden md:block ${
                isCurrent ? 'text-rose-950' : 'text-slate-300'
              }`}>
                {step.label}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}