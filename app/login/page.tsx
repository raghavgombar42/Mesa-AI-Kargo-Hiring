export default async function LoginPage(props: PageProps<"/login">) {
  const sp = await props.searchParams;
  return (
    <form action="/api/login" method="post" className="mx-auto mt-16 max-w-xs space-y-3 rounded-lg border border-stone-200 bg-white p-5">
      <h1 className="font-semibold">Kargo Hiring</h1>
      <input type="password" name="password" placeholder="Password" autoFocus className="w-full rounded border border-stone-300 px-2 py-1.5" />
      {sp.error && <p className="text-xs text-red-700">Wrong password.</p>}
      <button className="w-full rounded bg-stone-900 py-1.5 font-medium text-white">Sign in</button>
    </form>
  );
}
