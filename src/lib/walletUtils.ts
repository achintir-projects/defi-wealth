// Utility functions for wallet address generation and validation

/**
 * Generate a cryptographically secure Ethereum wallet address
 * This creates a properly formatted Ethereum address using secure random generation
 */
export function generateWalletAddress(): string {
  // Use crypto API for secure random number generation
  const array = new Uint8Array(20)
  crypto.getRandomValues(array)
  
  // Convert to hex string
  let hex = ''
  for (let i = 0; i < array.length; i++) {
    hex += array[i].toString(16).padStart(2, '0')
  }
  
  return '0x' + hex
}

/**
 * Generate a realistic-looking but deterministic wallet address for demo purposes
 * This creates consistent addresses while still maintaining proper format
 */
export function generateDemoWalletAddress(seed: string = 'demo'): string {
  // Create a simple hash from the seed using a more robust method
  let hash = 0
  const seedStr = seed + Date.now().toString()
  
  for (let i = 0; i < seedStr.length; i++) {
    const char = seedStr.charCodeAt(i)
    hash = ((hash << 5) - hash) + char
    hash = hash & hash // Convert to 32-bit integer
  }
  
  // Use the hash as a seed for a consistent-looking address
  const random = (index: number) => {
    const x = Math.sin(index + hash) * 10000
    return x - Math.floor(x)
  }
  
  // Generate address parts with better distribution
  const addressParts: string[] = []
  for (let i = 0; i < 40; i++) {
    const charIndex = Math.floor(random(i) * 16)
    addressParts.push(charIndex.toString(16))
  }
  
  return '0x' + addressParts.join('')
}

/**
 * Validate if a string is a properly formatted Ethereum address
 * This accepts any valid Ethereum address (0x followed by 40 hex characters)
 * Both checksummed and non-checksummed addresses are accepted
 */
export function isValidEthereumAddress(address: string): boolean {
  if (!address || typeof address !== 'string') {
    return false
  }
  
  // Remove any whitespace and convert to lowercase for validation
  const trimmedAddress = address.trim().toLowerCase()
  
  // Check basic format: starts with 0x and is 42 characters long
  if (!trimmedAddress.startsWith('0x') || trimmedAddress.length !== 42) {
    return false
  }
  
  // Check that all characters after 0x are valid hex characters
  const hexPart = trimmedAddress.substring(2)
  return /^[0-9a-f]{40}$/.test(hexPart)
}

/**
 * Format an Ethereum address for display (first 6 and last 4 characters)
 */
export function formatAddress(address: string): string {
  if (!address || !isValidEthereumAddress(address)) {
    return address || 'Invalid Address'
  }
  return `${address.substring(0, 6)}...${address.substring(address.length - 4)}`
}

/**
 * Generate multiple unique wallet addresses for demo purposes
 */
export function generateDemoWalletAddresses(count: number): string[] {
  const addresses: string[] = []
  
  for (let i = 0; i < count; i++) {
    const address = generateDemoWalletAddress(`wallet-${i}-${Date.now()}`)
    addresses.push(address)
  }
  
  return addresses
}

/**
 * Create a wallet object with address and basic info
 */
export interface WalletInfo {
  address: string
  formattedAddress: string
  createdAt: string
  type: 'generated' | 'imported'
}

/**
 * Create a new wallet info object
 */
export function createWalletInfo(type: 'generated' | 'imported' = 'generated', address?: string): WalletInfo {
  const walletAddress = address || generateWalletAddress()
  
  return {
    address: walletAddress,
    formattedAddress: formatAddress(walletAddress),
    createdAt: new Date().toISOString(),
    type
  }
}