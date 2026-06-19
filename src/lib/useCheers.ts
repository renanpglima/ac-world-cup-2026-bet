import {increment, onValue, ref, update} from 'firebase/database';
import {useEffect, useState} from 'react';

import {dataPath} from './dataRoot';
import {db} from './firebase';

export type CheerSide = 'team1' | 'team2';

// cheers/<matchNo>/{team1,team2} = tap count. Clicking a flag bumps its side;
// every online client sees the count rise (and fires a burst — see App).
export type CheerCounts = Record<string, Record<CheerSide, number>>;

export function useCheers(): {
	cheer: (matchNo: number, side: CheerSide) => void;
	counts: CheerCounts;
} {
	const [counts, setCounts] = useState<CheerCounts>({});

	useEffect(
		() =>
			onValue(ref(db, dataPath('cheers')), (snapshot) => {
				setCounts((snapshot.val() as CheerCounts) ?? {});
			}),
		[]
	);

	const cheer = (matchNo: number, side: CheerSide) => {
		update(ref(db, `${dataPath('cheers')}/${matchNo}`), {
			[side]: increment(1),
		});
	};

	return {cheer, counts};
}
