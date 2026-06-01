export function RouteLoadingView() {
  return (
    <main className="grid min-h-screen place-items-center bg-[#151611] px-6 text-[#f4efe4]">
      <div className="w-full max-w-sm text-center">
        <div className="mx-auto h-12 w-12 animate-spin rounded-full border-2 border-[#3d4234] border-t-[#d8c69a]" />
        <p className="mt-6 text-lg font-semibold">불러오는 중</p>
        <p className="mt-2 text-sm text-[#c8bea8]">화면을 준비하고 있습니다</p>
      </div>
    </main>
  );
}
