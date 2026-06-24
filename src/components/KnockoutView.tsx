import {useState} from 'react';

import type {KnockoutStandingRow} from '../lib/knockoutStandings';
import {KnockoutBracket} from './KnockoutBracket';
import {KnockoutLeaderboard} from './KnockoutLeaderboard';

function Tab({
	active,
	children,
	onClick,
}: {
	active: boolean;
	children: React.ReactNode;
	onClick: () => void;
}) {
	return (
		<button
			className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
				active
					? 'bg-emerald-500 text-emerald-950'
					: 'bg-white/5 text-slate-300 hover:bg-white/10'
			}`}
			onClick={onClick}
		>
			{children}
		</button>
	);
}

// The Knockout Stage page: the bracket (moved here from the Matches tab) and the
// zeroed knockout ranking, as two sub-tabs.
export function KnockoutView({
	rows,
	youUid,
}: {
	rows: KnockoutStandingRow[];
	youUid: string | null;
}) {
	const [view, setView] = useState<'bracket' | 'ranking'>('bracket');

	return (
		<div className="space-y-6">
			<div className="flex gap-1.5">
				<Tab active={view === 'bracket'} onClick={() => setView('bracket')}>
					Bracket
				</Tab>

				<Tab active={view === 'ranking'} onClick={() => setView('ranking')}>
					Ranking
				</Tab>
			</div>

			{view === 'bracket' ? (
				<KnockoutBracket />
			) : (
				<KnockoutLeaderboard rows={rows} youUid={youUid} />
			)}
		</div>
	);
}
