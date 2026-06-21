// src/components/AuthButton.tsx

// Header control: invites Google sign-in when anonymous; shows the signed-in
// user's avatar + name with a sign-out action otherwise.
export function AuthButton({
	name,
	onSignIn,
	onSignOut,
	photoURL,
	signedIn,
}: {
	name: string | null;
	onSignIn: () => void;
	onSignOut: () => void;
	photoURL: string | null;
	signedIn: boolean;
}) {
	if (!signedIn) {
		return (
			<button
				className="shrink-0 rounded-full bg-white/5 px-3 py-1.5 text-xs font-medium text-slate-300 transition hover:bg-white/10 hover:text-white"
				onClick={onSignIn}
			>
				Sign in with Google
			</button>
		);
	}

	return (
		<div className="flex shrink-0 items-center gap-2 rounded-full bg-white/5 py-0.5 pl-0.5 pr-1">
			{photoURL ? (
				<img
					alt=""
					className="h-6 w-6 rounded-full object-cover"
					referrerPolicy="no-referrer"
					src={photoURL}
				/>
			) : (
				<span className="flex h-6 w-6 items-center justify-center rounded-full bg-white/10 text-[10px] font-bold text-slate-200">
					{(name ?? '?').charAt(0)}
				</span>
			)}

			<span className="max-w-24 truncate text-xs font-medium text-slate-200">
				{name}
			</span>

			<button
				aria-label="Sign out"
				className="flex h-6 w-6 items-center justify-center rounded-full text-slate-400 transition hover:bg-white/10 hover:text-white"
				onClick={onSignOut}
			>
				⏻
			</button>
		</div>
	);
}
