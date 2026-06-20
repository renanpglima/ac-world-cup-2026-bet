// Two representative flag colors per team — [primary, secondary] — used to
// tint the pool-picks bar. Keyed by the same FIFA names as the flag map.
const PALETTES: Record<string, [string, string]> = {
	Algeria: ['#007229', '#D21034'],
	Argentina: ['#6CACE4', '#FFFFFF'],
	Australia: ['#012169', '#E4002B'],
	Austria: ['#ED2939', '#FFFFFF'],
	Belgium: ['#FDDA24', '#ED2939'],
	'Bosnia and Herzegovina': ['#002F6C', '#FECB00'],
	Brazil: ['#009C3B', '#FFDF00'],
	'Cabo Verde': ['#003893', '#CF2027'],
	Canada: ['#D52B1E', '#FFFFFF'],
	Colombia: ['#FCD116', '#003893'],
	'Congo DR': ['#007FFF', '#F7D618'],
	"Côte d'Ivoire": ['#FF8200', '#009A44'],
	Croatia: ['#FF0000', '#171796'],
	Curaçao: ['#002B7F', '#F9E814'],
	Czechia: ['#11457E', '#D7141A'],
	Ecuador: ['#FFDD00', '#034EA2'],
	Egypt: ['#CE1126', '#000000'],
	England: ['#CE1124', '#1D2D5C'],
	France: ['#0055A4', '#EF4135'],
	Germany: ['#DD0000', '#FFCE00'],
	Ghana: ['#006B3F', '#FCD116'],
	Haiti: ['#00209F', '#D21034'],
	'IR Iran': ['#239F40', '#DA0000'],
	Iraq: ['#CE1126', '#007A3D'],
	Japan: ['#BC002D', '#FFFFFF'],
	Jordan: ['#CE1126', '#007A3D'],
	'Korea Republic': ['#003478', '#C60C30'],
	Mexico: ['#006847', '#CE1126'],
	Morocco: ['#C1272D', '#006233'],
	Netherlands: ['#F36C21', '#21468B'],
	'New Zealand': ['#00247D', '#CC142B'],
	Norway: ['#BA0C2F', '#00205B'],
	Panama: ['#005293', '#DA121A'],
	Paraguay: ['#D52B1E', '#0038A8'],
	Portugal: ['#006600', '#FF0000'],
	Qatar: ['#8A1538', '#FFFFFF'],
	'Saudi Arabia': ['#006C35', '#FFFFFF'],
	Scotland: ['#0065BF', '#FFFFFF'],
	Senegal: ['#00853F', '#FDEF42'],
	'South Africa': ['#007A4D', '#FFB81C'],
	Spain: ['#AA151B', '#F1BF00'],
	Sweden: ['#006AA7', '#FECC00'],
	Switzerland: ['#D52B1E', '#FFFFFF'],
	Tunisia: ['#E70013', '#FFFFFF'],
	Türkiye: ['#E30A17', '#FFFFFF'],
	USA: ['#3C3B6E', '#B22234'],
	Uruguay: ['#0038A8', '#FCD116'],
	Uzbekistan: ['#0099B5', '#1EB53A'],
	Wales: ['#C8102E', '#00AB39'],
};

const FALLBACK: [string, string] = ['#94A3B8', '#475569'];

function normalize(name: string): string {
	return name
		.normalize('NFD')
		.replace(/[̀-ͯ]/g, '')
		.toLowerCase()
		.replace(/[^a-z0-9]/g, '');
}

const BY_KEY: Record<string, [string, string]> = Object.fromEntries(
	Object.entries(PALETTES).map(([name, palette]) => [
		normalize(name),
		palette,
	])
);

function palette(team: string): [string, string] {
	return BY_KEY[normalize(team)] ?? FALLBACK;
}

function toHsl(hex: string): [number, number, number] {
	const r = parseInt(hex.slice(1, 3), 16) / 255;
	const g = parseInt(hex.slice(3, 5), 16) / 255;
	const b = parseInt(hex.slice(5, 7), 16) / 255;

	const max = Math.max(r, g, b);
	const min = Math.min(r, g, b);
	const l = (max + min) / 2;
	const d = max - min;

	let h = 0;
	let s = 0;

	if (d !== 0) {
		s = d / (1 - Math.abs(2 * l - 1));

		if (max === r) {
			h = 60 * (((g - b) / d) % 6);
		}
		else if (max === g) {
			h = 60 * ((b - r) / d + 2);
		}
		else {
			h = 60 * ((r - g) / d + 4);
		}
	}

	if (h < 0) {
		h += 360;
	}

	return [h, s, l];
}

// Two colors read as "the same kit" when their hues are close. A near-white,
// near-black, or gray reads as distinct from any saturated color (so a flag's
// white/black secondary always separates a same-hue pair).
function similar(a: string, b: string): boolean {
	const [ha, sa, la] = toHsl(a);
	const [hb, sb, lb] = toHsl(b);

	const grayA = sa < 0.22 || la < 0.12 || la > 0.92;
	const grayB = sb < 0.22 || lb < 0.12 || lb > 0.92;

	if (grayA || grayB) {
		return grayA && grayB;
	}

	let dh = Math.abs(ha - hb);

	if (dh > 180) {
		dh = 360 - dh;
	}

	return dh < 30;
}

// Pool-picks bar colors. The home team (team1) keeps its primary; if the away
// team's primary clashes with it, the away switches to its secondary — and if
// that still clashes, the home falls back to its own secondary.
export function poolBarColors(
	team1: string,
	team2: string
): {color1: string; color2: string} {
	const [home1, home2] = palette(team1);
	const [away1, away2] = palette(team2);

	let color1 = home1;
	let color2 = away1;

	if (similar(color1, color2)) {
		color2 = away2;

		if (similar(color1, color2)) {
			color1 = home2;
		}
	}

	return {color1, color2};
}
