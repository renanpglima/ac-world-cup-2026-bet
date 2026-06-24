import {onValue, ref, serverTimestamp, set} from 'firebase/database';
import {useEffect, useState} from 'react';

import {dataPath} from './dataRoot';
import {db} from './firebase';
import type {KnockoutPick} from './knockoutCards';

export interface KnockoutIdentity {
	name: string;
	photoURL: string | null;
	uid: string;
}

type PicksTree = Record<string, Record<string, KnockoutPick>>;

// knockoutPicks/<uid>/<matchNo> = {at, name, p1, p2, photoURL}. Public read so
// everyone's picks show in the match card; each user writes only their own.
export function useKnockoutPicks(identity: KnockoutIdentity | null): {
	byMatch: Record<number, KnockoutPick[]>;
	byUid: Record<string, Record<number, KnockoutPick>>;
	mine: Record<number, KnockoutPick>;
	setPick: (matchNo: number, p1: number, p2: number) => void;
} {
	const [tree, setTree] = useState<PicksTree>({});

	useEffect(
		() =>
			onValue(ref(db, dataPath('knockoutPicks')), (snapshot) => {
				setTree((snapshot.val() as PicksTree) ?? {});
			}),
		[]
	);

	const byMatch: Record<number, KnockoutPick[]> = {};
	const byUid: Record<string, Record<number, KnockoutPick>> = {};
	const mine: Record<number, KnockoutPick> = {};

	for (const [uid, matches] of Object.entries(tree)) {
		for (const [matchNo, pick] of Object.entries(matches)) {
			const num = Number(matchNo);
			const entry: KnockoutPick = {...pick, uid};

			(byMatch[num] ??= []).push(entry);
			(byUid[uid] ??= {})[num] = entry;

			if (identity && uid === identity.uid) {
				mine[num] = entry;
			}
		}
	}

	const setPick = (matchNo: number, p1: number, p2: number) => {
		if (!identity) {
			return;
		}

		set(
			ref(db, `${dataPath('knockoutPicks')}/${identity.uid}/${matchNo}`),
			{
				at: serverTimestamp(),
				name: identity.name,
				p1,
				p2,
				photoURL: identity.photoURL,
			}
		);
	};

	return {byMatch, byUid, mine, setPick};
}
