// Floating button that opens the global chat from any page.
export function ChatButton({onClick}: {onClick: () => void}) {
	return (
		<button
			aria-label="Open chat"
			className="fixed bottom-4 right-4 z-40 flex h-12 w-12 items-center justify-center rounded-full bg-emerald-500 text-xl shadow-lg transition-colors hover:bg-emerald-400"
			onClick={onClick}
		>
			💬
		</button>
	);
}
