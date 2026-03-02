const StepRail = ({ hasStep2, step1Y, step2Y }: { hasStep2: boolean; step1Y: number | null; step2Y: number | null }) => {
  return (
    <div className="relative">
      {hasStep2 && step1Y != null && step2Y != null && step2Y > step1Y ? (
        <div
          className="absolute left-1/2 w-px bg-[#c2cfed] -translate-x-1/2"
          style={{
            top: step1Y + 24, //STEP_CIRCLE_RADIUS
            height: step2Y - step1Y,
          }}
        />
      ) : null}

      {step1Y != null ? (
        <div className="absolute left-1/2 -translate-x-1/2" style={{ top: step1Y }}>
          <div className="w-12 h-12 rounded-full border-2 border-blue-200 bg-white text-blue-700 flex items-center justify-center font-medium shadow-sm">1</div>
        </div>
      ) : null}

      {hasStep2 && step2Y != null ? (
        <div className="absolute left-1/2 -translate-x-1/2" style={{ top: step2Y }}>
          <div className="w-12 h-12 rounded-full border-2 border-blue-200 bg-white text-blue-700 flex items-center justify-center font-medium shadow-sm">2</div>
        </div>
      ) : null}
    </div>
  );
};

export default StepRail;
