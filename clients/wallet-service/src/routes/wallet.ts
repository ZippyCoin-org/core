import { Router, Request, Response } from 'express';
import { WalletService } from '../services/WalletService';
import { validateCreateWallet, validateImportWallet } from '../middleware/validation';
import { logger } from '../utils/logger';

const router = Router();
const walletService = new WalletService();

// Create new wallet
router.post('/create', validateCreateWallet, async (req: Request, res: Response) => {
  try {
    const { password, mnemonic } = req.body;
    const wallet = await walletService.createWallet(password, mnemonic);
    
    logger.info('Wallet created successfully');
    res.status(201).json({
      success: true,
      data: {
        address: wallet.address,
        publicKey: wallet.publicKey,
        encryptedPrivateKey: wallet.encryptedPrivateKey,
        mnemonic: wallet.mnemonic
      }
    });
  } catch (error) {
    logger.error('Error creating wallet:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to create wallet' 
    });
  }
});

// Import wallet from mnemonic
router.post('/import', validateImportWallet, async (req: Request, res: Response) => {
  try {
    const { mnemonic, password } = req.body;
    const wallet = await walletService.importWallet(mnemonic, password);
    
    logger.info('Wallet imported successfully');
    res.json({
      success: true,
      data: {
        address: wallet.address,
        publicKey: wallet.publicKey,
        encryptedPrivateKey: wallet.encryptedPrivateKey
      }
    });
  } catch (error) {
    logger.error('Error importing wallet:', error);
    res.status(400).json({ 
      success: false, 
      error: 'Invalid mnemonic or password' 
    });
  }
});

// Get wallet info
router.get('/:address', async (req: Request, res: Response) => {
  try {
    const { address } = req.params;
    const walletInfo = await walletService.getWalletInfo(address);
    
    res.json({
      success: true,
      data: walletInfo
    });
  } catch (error) {
    logger.error('Error getting wallet info:', error);
    res.status(404).json({ 
      success: false, 
      error: 'Wallet not found' 
    });
  }
});

// Generate new address
router.post('/:address/addresses', async (req: Request, res: Response) => {
  try {
    const { address } = req.params;
    const { password } = req.body;
    const newAddress = await walletService.generateNewAddress(address, password);
    
    logger.info('New address generated');
    res.json({
      success: true,
      data: {
        address: newAddress
      }
    });
  } catch (error) {
    logger.error('Error generating new address:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to generate new address' 
    });
  }
});

// Export wallet (get mnemonic)
router.post('/:address/export', async (req: Request, res: Response) => {
  try {
    const { address } = req.params;
    const { password } = req.body;
    const mnemonic = await walletService.exportWallet(address, password);
    
    logger.info('Wallet exported successfully');
    res.json({
      success: true,
      data: {
        mnemonic
      }
    });
  } catch (error) {
    logger.error('Error exporting wallet:', error);
    res.status(400).json({ 
      success: false, 
      error: 'Invalid password' 
    });
  }
});

// Backup wallet
router.post('/:address/backup', async (req: Request, res: Response) => {
  try {
    const { address } = req.params;
    const { password } = req.body;
    const backup = await walletService.backupWallet(address, password);
    
    logger.info('Wallet backup created');
    res.json({
      success: true,
      data: backup
    });
  } catch (error) {
    logger.error('Error backing up wallet:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to backup wallet' 
    });
  }
});

export { router as walletRoutes }; 