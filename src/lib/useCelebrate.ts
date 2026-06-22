import {increment, onValue, ref, update} from 'firebase/database';
import {useEffect, useState} from 'react';

import {dataPath} from './dataRoot';
import {db} from './firebase';

// A shared, everyone-sees-it celebration. `/celebrate <name>` bumps a counter
// plus the celebrated participant's name; every online client detects the bump
// and renders a full-screen burst — same broadcast pattern as the leader hype.
export interface CelebrateEvent {
	n: number;
	name: string;
}

export function useCelebrate(): {
	celebrate: (name: string) => void;
	last: CelebrateEvent;
} {
	const [last, setLast] = useState<CelebrateEvent>({n: 0, name: ''});

	useEffect(
		() =>
			onValue(ref(db, dataPath('celebrate')), (snapshot) => {
				const value = snapshot.val() as CelebrateEvent | null;

				if (value) {
					setLast({n: value.n ?? 0, name: value.name ?? ''});
				}
			}),
		[]
	);

	const celebrate = (name: string) => {
		update(ref(db, dataPath('celebrate')), {n: increment(1), name});
	};

	return {celebrate, last};
}
