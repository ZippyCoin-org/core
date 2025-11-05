import { NFTManager } from '../services/NFTManager';

describe('NFTManager', () => {
	let manager: NFTManager;

	beforeEach(() => {
		manager = new NFTManager();
	});

	it('initializes and exposes default collections', async () => {
		await manager.initialize();
		const collections = manager.getCollections();
		expect(collections.length).toBeGreaterThan(0);
	});

	it('mints NFT and updates collection supply', async () => {
		const col = manager.getCollections()[0];
		const before = col.totalSupply;
		const nft = await manager.mintNFT(
			col.id,
			'zpc1owner',
			'zpc1creator',
			'Trust Credential',
			'Proof of trust',
			'https://example.com/img.png',
			{ level: 'gold' },
			90,
			'identity'
		);
		expect(nft.id).toContain(col.id);
		expect(manager.getCollection(col.id)?.totalSupply).toBe(before + 1);
	});

	it('transfers NFT with trust restrictions', async () => {
		const col = manager.getCollections()[0];
		const nft = await manager.mintNFT(
			col.id,
			'zpc1alice',
			'zpc1creator',
			'Badge',
			'Badge desc',
			'https://example.com/img.png',
			{},
			50,
			'achievement'
		);
		const ok = await manager.transferNFT(nft.id, 'zpc1alice', 'zpc1bob', 75);
		expect(ok).toBe(true);
		expect(manager.getNFT(nft.id)?.owner).toBe('zpc1bob');
	});

	it('verifies credential and marks NFT verified', async () => {
		const col = manager.getCollections()[0];
		const nft = await manager.mintNFT(
			col.id,
			'zpc1u',
			'zpc1c',
			'Identity',
			'',
			'',
			{},
			85,
			'identity'
		);
		const v = await manager.verifyCredential(
			nft.id,
			'zpc1verifier',
			'identity',
			{ kyc: true },
			90,
			'0xsignature'
		);
		expect(v.verified).toBe(true);
		expect(manager.getNFT(nft.id)?.verified).toBe(true);
	});
});

