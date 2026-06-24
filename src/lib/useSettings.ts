import {onValue, ref, set} from 'firebase/database';
import {useEffect, useState} from 'react';

import {dataPath} from './dataRoot';
import {db} from './firebase';

// settings/* — global app config the owner toggles from the admin screen
// (public read so every client honors it). Demo-aware like the rest of the data.
export function useSettings(): {
	chatLoginOnly: boolean;
	setChatLoginOnly: (value: boolean) => void;
} {
	const [chatLoginOnly, setChatLoginOnly] = useState(false);

	useEffect(
		() =>
			onValue(ref(db, dataPath('settings/chatLoginOnly')), (snapshot) => {
				setChatLoginOnly(snapshot.val() === true);
			}),
		[]
	);

	return {
		chatLoginOnly,
		setChatLoginOnly: (value) => {
			set(ref(db, dataPath('settings/chatLoginOnly')), value);
		},
	};
}
