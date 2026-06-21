// src/lib/useProfiles.ts
import {onValue, ref, set, update} from 'firebase/database';
import {useEffect, useMemo, useState} from 'react';

import {
	type Approval,
	deriveUserRows,
	type Profile,
	type UserRow,
} from './profiles';
import {db} from './firebase';

export interface ProfilesApi {
	approve: (uid: string, slug: string) => void;
	reject: (uid: string) => void;
	rows: UserRow[];
	setBlocked: (uid: string, blocked: boolean) => void;
	unlink: (uid: string) => void;
}

export function useProfiles(): ProfilesApi {
	const [profiles, setProfiles] = useState<Record<string, Profile>>({});
	const [approvals, setApprovals] = useState<Record<string, Approval>>({});

	useEffect(
		() =>
			onValue(ref(db, 'profiles'), (snapshot) => {
				setProfiles((snapshot.val() as Record<string, Profile>) ?? {});
			}),
		[]
	);

	useEffect(
		() =>
			onValue(ref(db, 'approvals'), (snapshot) => {
				setApprovals(
					(snapshot.val() as Record<string, Approval>) ?? {}
				);
			}),
		[]
	);

	const rows = useMemo(
		() => deriveUserRows(profiles, approvals),
		[profiles, approvals]
	);

	return {
		// Owner writes the approved link; the claim now equals the participant
		// so the row stops being pending.
		approve: (uid, slug) => {
			update(ref(db, `approvals/${uid}`), {participant: slug});
			set(ref(db, `profiles/${uid}/claim`), slug);
		},
		// Reject clears the user's claim (owner may write profiles per rules).
		reject: (uid) => {
			set(ref(db, `profiles/${uid}/claim`), null);
		},
		rows,
		setBlocked: (uid, blocked) => {
			update(ref(db, `approvals/${uid}`), {blocked});
		},
		unlink: (uid) => {
			update(ref(db, `approvals/${uid}`), {participant: null});
		},
	};
}
