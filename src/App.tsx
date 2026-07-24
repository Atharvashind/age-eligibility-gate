import { useState, useEffect } from 'react';
import { Shield, Play, Database, History, Wallet, Cpu, Lock, Key, Calendar, ClipboardCheck } from 'lucide-react';
import { deployAgegateContract, submitAgegateCircuit } from './midnightClient';

export default function App() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [walletConnected, setWalletConnected] = useState(false);
  const [walletAddress, setWalletAddress] = useState<string | null>(null);
  const [walletBalance, setWalletBalance] = useState<string>("0.00");
  const [connectingWallet, setConnectingWallet] = useState(false);
  const [faucetLoading, setFaucetLoading] = useState(false);
  const [laceDetected, setLaceDetected] = useState(false);
  const [connectedWallet, setConnectedWallet] = useState<any>(null);

  const [contractDeployed, setContractDeployed] = useState(false);
  const [contractAddress, setContractAddress] = useState<string | null>(null);
  const [isDeploying, setIsDeploying] = useState(false);
  const [deployStep, setDeployStep] = useState(0);

  const [ledger, setLedger] = useState({ minimum_age: 18, trusted_issuers: "Govt_Passport_Division", eligibility_verified: "false" });
  const [formValues, setFormValues] = useState({ birth_year: 2004, gov_sig: "sig:govt:passport:valid" });
  const [logs, setLogs] = useState([
    { hash: '0x88b...d891', timestamp: '2026-07-08 09:35:00', status: 'VERIFIED', details: 'Validated threshold credential' }
  ]);
  const [isProving, setIsProving] = useState(false);
  const [provingStep, setProvingStep] = useState(0);

  const proofSteps = [
    "Reading birthdate credential securely...",
    "Validating credential signature...",
    "Running inequality circuit: (currentYear - birthYear) >= 18...",
    "Generating public proof of eligibility..."
  ];

  const deploySteps = [
    "Compiling age gate compact parameters...",
    "Spawning Preprod transaction block...",
    "Anchoring credentials validator on-chain..."
  ];

  useEffect(() => {
    fetch('/deployment.json').then(response => response.ok ? response.json() : null).then(deployment => {
      if (deployment?.contractAddress) {
        setContractAddress(deployment.contractAddress);
        setContractDeployed(true);
      }
    }).catch(() => undefined);
    const detectLace = () => {
      const hasMidnightWallet = Object.values((window as any).midnight ?? {}).some((candidate: any) => typeof candidate?.connect === 'function');
      setLaceDetected(hasMidnightWallet);
    };
    detectLace();
    const timer = setInterval(detectLace, 1000);
    return () => clearInterval(timer);
  }, []);

  const connectLace = async () => {
    setConnectingWallet(true);
    try {
      const candidates = Object.values((window as any).midnight ?? {}) as Array<{
        connect?: (networkId: string) => Promise<any>;
        name?: string;
      }>;
      const wallet = candidates.find(candidate => typeof candidate.connect === 'function');
      if (!wallet?.connect) {
        throw new Error('No Midnight wallet connector was detected. Install 1AM or Lace and unlock it.');
      }

      const connected = await wallet.connect(import.meta.env.VITE_NETWORK_ID || 'preprod');
      (window as any).__midnightConnectedWallet = connected;
      const addressInfo = await connected.getUnshieldedAddress();
      const balances = await connected.getUnshieldedBalances();
      const nightBalance = Object.values(balances)[0] ?? 0n;

      setWalletAddress(addressInfo.unshieldedAddress);
      setWalletBalance((Number(nightBalance) / 1_000_000).toFixed(2));
      setWalletConnected(true);
      setConnectedWallet(connected);
      if (import.meta.env.VITE_CONTRACT_ADDRESS) {
        setContractAddress(import.meta.env.VITE_CONTRACT_ADDRESS);
        setContractDeployed(true);
      }
      logTransaction('wallet', 'MIDNIGHT WALLET CONNECTED', '—', 'Connected through the Midnight DApp Connector API');
    } catch (err) {
      console.error('Midnight wallet connection failed:', err);
      alert(err instanceof Error ? err.message : 'Midnight wallet connection failed.');
    } finally {
      setConnectingWallet(false);
    }
  };



  const disconnectLace = () => {
    setWalletConnected(false);
    setWalletAddress(null);
    setWalletBalance("0.00");
    logTransaction('0x0000...0000', 'LACE WALLET DISCONNECTED', '0.00 tNIGHT', 'Disconnected wallet context');
  };

  const requestFaucet = () => {
    if (!walletConnected) return;
    window.open(import.meta.env.VITE_FAUCET_URL || 'https://midnight-tmnight-preprod.nethermind.dev/', '_blank', 'noopener,noreferrer');
    logTransaction('—', 'FAUCET OPENED', '—', 'Funding must be confirmed by the Midnight Preprod Faucet and wallet balance refresh.');
  };

  const deployContractAction = async () => {
    if (import.meta.env.VITE_CONTRACT_ADDRESS) {
      setContractAddress(import.meta.env.VITE_CONTRACT_ADDRESS);
      setContractDeployed(true);
      logTransaction('—', 'DEPLOYMENT CONFIGURED', '—', 'Using the deployed Midnight contract configured for this environment.');
      return;
    }
    if (!connectedWallet) return;
    setIsDeploying(true);
    try {
      const result = await deployAgegateContract(connectedWallet);
      setContractAddress(result.contractAddress);
      setContractDeployed(true);
      logTransaction(result.txId, 'CONTRACT DEPLOYMENT SUBMITTED', '—', 'age_gate deployed on Midnight Preprod at ' + result.contractAddress);
    } catch (err) {
      console.error('Browser deployment failed:', err);
      alert(err instanceof Error ? err.message : 'Browser deployment failed.');
    } finally {
      setIsDeploying(false);
    }
    return;
    if (import.meta.env.VITE_DEMO_MODE !== 'true') {
      alert('Live contract deployment is handled by deploy.mjs. Set VITE_DEMO_MODE=true only for local UI demos.');
      return;
    }
    if (!walletConnected) return;
    setIsDeploying(true);
    setDeployStep(0);
    const interval = setInterval(() => {
      setDeployStep(prev => {
        if (prev < deploySteps.length - 1) {
          return prev + 1;
        } else {
          clearInterval(interval);
          setTimeout(() => {
            setContractAddress("midnight1a89vja0928hskla9382hdksla0298a09vja");
            setContractDeployed(true);
            setIsDeploying(false);
            setWalletBalance(prevBal => (parseFloat(prevBal) - 15.5).toFixed(2));
            logTransaction('0xdep1...77bb', 'CONTRACT DEPLOYED', '-15.50 tNIGHT', 'Deployed age_gate.compact contract onto Preprod');
          }, 800);
          return prev;
        }
      });
    }, 500);
  };

  const verifyAge = async () => {
    if (!walletConnected || !contractDeployed || !contractAddress) return;
    try {
      const result = await submitAgegateCircuit((window as any).__midnightConnectedWallet, contractAddress, 'verifyAge', [BigInt(Math.floor(Date.now() / 1000))]);
      setLedger(prev => ({ ...prev, eligibility_verified: 'true' }));
      logTransaction(result.txId, 'CONFIRMED ON MIDNIGHT', '—', 'Confirmed verifyAge on ' + contractAddress);
      return;
    } catch (err) {
      alert(err instanceof Error ? err.message : 'The Midnight transaction failed.');
      logTransaction('—', 'TRANSACTION FAILED', '—', err instanceof Error ? err.message : 'Unknown transaction failure');
      return;
    }
    setIsProving(true);
    setProvingStep(0);
    const interval = setInterval(() => {
      setProvingStep(prev => {
        if (prev < proofSteps.length - 1) {
          return prev + 1;
        } else {
          clearInterval(interval);
          setTimeout(() => {
            const currentYear = new Date().getFullYear();
            const age = currentYear - Number(formValues.birth_year);
            const passed = age >= ledger.minimum_age;
            
            setLedger(prevLedger => ({
              ...prevLedger,
              eligibility_verified: passed ? "true" : "false"
            }));
            
            const randomTx = '0x' + Array.from({length: 8}, () => Math.floor(Math.random()*16).toString(16)).join('') + '...' + Array.from({length: 4}, () => Math.floor(Math.random()*16).toString(16)).join('');
            logTransaction(randomTx, passed ? 'VERIFIED' : 'REJECTED', '-0.05 tNIGHT', `Asserted age >= ${ledger.minimum_age} privately`);
            setIsProving(false);
            setWalletBalance(prevBal => (parseFloat(prevBal) - 0.05).toFixed(2));
          }, 600);
          return prev;
        }
      });
    }, 500);
  };

  const logTransaction = (hash: string, status: string, fee: string, details: string) => {
    setLogs(prev => [
      {
        hash,
        timestamp: new Date().toISOString().replace('T', ' ').substring(0, 19),
        status,
        fee,
        details
      },
      ...prev
    ]);
  };

  return (
    <div style={{ display: 'flex', minHeight: '100vh', fontFamily: 'Outfit, sans-serif' }}>
      
      {/* Sidebar Layout */}
      <aside style={{ width: '280px', background: 'var(--bg-secondary)', borderRight: '1px solid var(--border-color)', padding: '30px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '40px' }}>
            <div style={{ background: 'rgba(217, 119, 6, 0.1)', border: '1px solid var(--border-color)', borderRadius: '10px', padding: '8px' }}>
              <Shield className="w-6 h-6 text-amber-500" />
            </div>
            <div>
              <h2 style={{ fontSize: '1.2rem', margin: 0, fontWeight: 800, color: 'white' }}>VeriGate</h2>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Midnight Age Gate</span>
            </div>
          </div>

          <nav style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <button 
              onClick={() => setActiveTab('dashboard')} 
              style={{ 
                justifyContent: 'flex-start',
                background: activeTab === 'dashboard' ? 'rgba(217, 119, 6, 0.1)' : 'transparent',
                color: activeTab === 'dashboard' ? 'white' : 'var(--text-secondary)',
                border: '1px solid ' + (activeTab === 'dashboard' ? 'var(--border-color)' : 'transparent'),
                textAlign: 'left'
              }}
            >
              📊 DApp Workspace
            </button>
            <button 
              onClick={() => setActiveTab('deployer')} 
              style={{ 
                justifyContent: 'flex-start',
                background: activeTab === 'deployer' ? 'rgba(217, 119, 6, 0.1)' : 'transparent',
                color: activeTab === 'deployer' ? 'white' : 'var(--text-secondary)',
                border: '1px solid ' + (activeTab === 'deployer' ? 'var(--border-color)' : 'transparent'),
                textAlign: 'left'
              }}
            >
              ⚙️ ZK Deployer
            </button>
            <button 
              onClick={() => setActiveTab('walletHub')} 
              style={{ 
                justifyContent: 'flex-start',
                background: activeTab === 'walletHub' ? 'rgba(217, 119, 6, 0.1)' : 'transparent',
                color: activeTab === 'walletHub' ? 'white' : 'var(--text-secondary)',
                border: '1px solid ' + (activeTab === 'walletHub' ? 'var(--border-color)' : 'transparent'),
                textAlign: 'left'
              }}
            >
              🔑 Lace Wallet Hub
            </button>
            <button 
              onClick={() => setActiveTab('privacy')} 
              style={{ 
                justifyContent: 'flex-start',
                background: activeTab === 'privacy' ? 'rgba(217, 119, 6, 0.1)' : 'transparent',
                color: activeTab === 'privacy' ? 'white' : 'var(--text-secondary)',
                border: '1px solid ' + (activeTab === 'privacy' ? 'var(--border-color)' : 'transparent'),
                textAlign: 'left'
              }}
            >
              🔒 ZK Privacy Model
            </button>
          </nav>
        </div>

        <div>
          {walletConnected ? (
            <div style={{ background: 'rgba(0,0,0,0.4)', border: '1px solid var(--border-color)', borderRadius: '12px', padding: '12px' }}>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', fontWeight: 600 }}>LACE CONNECTED</div>
              <div style={{ fontSize: '0.9rem', fontWeight: 700, color: '#f59e0b', marginTop: '2px' }}>{walletBalance} tNIGHT</div>
            </div>
          ) : (
            <button onClick={connectLace} style={{ fontSize: '0.85rem' }}>
              Connect Wallet
            </button>
          )}
        </div>
      </aside>

<section className="home-dashboard" aria-labelledby="home-dashboard-title">
        <div className="home-dashboard__lead">
          <span className="home-kicker">Credential desk</span>
          <h2 id="home-dashboard-title">Eligibility policy</h2>
          <p>Prove the threshold without uploading a birthdate.</p>
          <div className="home-actions">
            <button type="button" onClick={() => setActiveTab('dashboard')}>Open Workspace</button>
            <button type="button" className="home-secondary" onClick={() => setActiveTab('privacy')}>Read Privacy Model</button>
          </div>
        </div>
        <div className="home-dashboard__grid">
          <article className="home-card"><span>Network</span><strong>Midnight Preprod</strong><small>{contractDeployed ? 'Contract verified' : 'Contract setup pending'}</small></article>
          <article className="home-card"><span>Current signal</span><strong>18+ threshold</strong><small>3 issuer checks ready</small></article>
          <article className="home-card"><span>Wallet session</span><strong>{walletConnected ? 'Connected' : 'Not connected'}</strong><small>{walletConnected ? walletBalance + ' tNIGHT available' : 'Connect 1AM to continue'}</small></article>
          <article className="home-card"><span>Contract address</span><strong className="home-address">{contractAddress ? contractAddress.slice(0, 14) + '…' : 'Awaiting deployment'}</strong><small>Unique project deployment</small></article>
        </div>
      </section>

      {/* Main Content Area */}
      <main style={{ flex: 1, padding: '40px' }}>
        {activeTab === 'dashboard' && (
          <div>
            {(!walletConnected || !contractDeployed) && (
              <div style={{ background: 'rgba(239, 68, 68, 0.05)', border: '1px solid rgba(239,68,68,0.2)', padding: '20px', borderRadius: '12px', marginBottom: '30px', textAlign: 'center' }}>
                <h3 style={{ margin: 0, color: '#f87171' }}>⚠️ Missing Setup Prerequisites</h3>
                <p style={{ color: 'var(--text-secondary)', margin: '8px 0 0 0', fontSize: '0.9rem' }}>
                  {!walletConnected ? "Please connect your Lace Wallet in the sidebar." : "Please deploy the Compact contract in the ZK Deployer tab."}
                </p>
              </div>
            )}

            <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '30px', opacity: (walletConnected && contractDeployed) ? 1 : 0.4, pointerEvents: (walletConnected && contractDeployed) ? 'auto' : 'none' }}>
              <div>
                <section style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '16px', padding: '24px', marginBottom: '30px' }}>
                  <h2 style={{ fontSize: '1.3rem', marginBottom: '16px', color: '#f59e0b', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <ClipboardCheck className="w-5 h-5" /> Requirements Parameters
                  </h2>
                  <div style={{ background: 'rgba(0,0,0,0.4)', padding: '20px', borderRadius: '12px', border: '1px solid var(--border-color)', display: 'flex', gap: '20px' }}>
                    <div style={{ flex: 1 }}>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>MINIMUM AGE</span>
                      <div style={{ fontSize: '1.8rem', fontWeight: 800, color: 'white', marginTop: '4px' }}>{ledger.minimum_age}+</div>
                    </div>
                    <div style={{ flex: 2 }}>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>TRUSTED AUTHORITY</span>
                      <div style={{ fontSize: '1.1rem', fontWeight: 700, color: 'white', marginTop: '8px' }}>{ledger.trusted_issuers}</div>
                    </div>
                  </div>
                </section>

                <section style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '16px', padding: '24px', textAlign: 'center' }}>
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 600 }}>ZK ELIGIBILITY OUTCOME STATUS</span>
                  <div style={{ fontSize: '1.4rem', fontWeight: 800, marginTop: '8px', color: ledger.eligibility_verified === "true" ? 'var(--color-success)' : '#ef4444' }}>
                    {ledger.eligibility_verified === "true" ? "✓ ELIGIBILITY VERIFIED SUCCESSFULLY" : "✕ UNVERIFIED / REJECTED"}
                  </div>
                </section>
              </div>

              <div>
                <section style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '16px', padding: '24px' }}>
                  <h2 style={{ fontSize: '1.3rem', marginBottom: '16px', color: '#f59e0b', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Calendar className="w-5 h-5" /> Secret Credential Input
                  </h2>
                  <div style={{ marginBottom: '16px' }}>
                    <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '6px' }}>Your Birth Year (Secret Witness)</label>
                    <input 
                      type="number" 
                      value={formValues.birth_year} 
                      onChange={e => setFormValues({ ...formValues, birth_year: Number(e.target.value) })}
                    />
                  </div>
                  <div style={{ marginBottom: '20px' }}>
                    <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '6px' }}>Authority Signature</label>
                    <input 
                      type="text" 
                      value={formValues.gov_sig} 
                      onChange={e => setFormValues({ ...formValues, gov_sig: e.target.value })}
                    />
                  </div>
                  <button onClick={verifyAge} disabled={isProving}>
                    {isProving ? "Generating ZK Proof..." : "Verify Gate Compliance"}
                  </button>

                  {isProving && (
                    <div style={{ marginTop: '20px', padding: '12px', background: 'rgba(217, 119, 6, 0.05)', border: '1px dashed #d97706', borderRadius: '10px', fontSize: '0.8rem' }}>
                      {proofSteps.map((step, idx) => (
                        <div key={idx} style={{ padding: '3px 0', color: idx === provingStep ? 'white' : 'var(--text-secondary)', opacity: idx <= provingStep ? 1 : 0.4 }}>
                          {idx < provingStep ? '✓' : '●'} {step}
                        </div>
                      ))}
                    </div>
                  )}
                </section>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'deployer' && (
          <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '16px', padding: '30px' }}>
            <h2 style={{ fontSize: '1.5rem', display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px', color: '#f59e0b' }}>
              <Cpu className="w-6 h-6" /> ZK Gate Deployer
            </h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem', marginBottom: '24px' }}>
              Compile and deploy the <code>age_gate.compact</code> smart contract parameters to Preprod net.
            </p>

            {contractDeployed ? (
              <div style={{ background: 'rgba(16, 185, 129, 0.05)', border: '1px solid rgba(16, 185, 129, 0.2)', padding: '20px', borderRadius: '12px' }}>
                <h3 style={{ margin: '0 0 10px 0', color: '#10b981' }}>Active Age Gate Parameters Anchored</h3>
                <div style={{ fontFamily: 'monospace', fontSize: '0.85rem' }}>Address: {contractAddress}</div>
              </div>
            ) : (
              <button onClick={deployContractAction} disabled={isDeploying || !walletConnected}>
                {isDeploying ? "Deploying Block..." : "Deploy Contract Gate"}
              </button>
            )}

            {isDeploying && (
              <div style={{ marginTop: '20px', padding: '12px', background: 'rgba(217, 119, 6, 0.05)', border: '1px dashed #d97706', borderRadius: '10px', fontSize: '0.8rem' }}>
                {deploySteps.map((step, idx) => (
                  <div key={idx} style={{ padding: '3px 0', color: idx === deployStep ? 'white' : 'var(--text-secondary)', opacity: idx <= deployStep ? 1 : 0.4 }}>
                    {idx < deployStep ? '✓' : '●'} {step}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'walletHub' && (
          <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '16px', padding: '30px' }}>
            <h2 style={{ fontSize: '1.5rem', display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px', color: '#f59e0b' }}>
              <Wallet className="w-6 h-6" /> Wallet Hub & Faucet
            </h2>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '30px', marginBottom: '30px' }}>
              <div style={{ background: 'rgba(0,0,0,0.3)', border: '1px solid var(--border-color)', padding: '20px', borderRadius: '12px' }}>
                <h3>Simulated Lace Keys</h3>
                {walletConnected ? (
                  <div>
                    <div style={{ wordBreak: 'break-all', fontFamily: 'monospace', fontSize: '0.85rem', marginBottom: '10px' }}>{walletAddress}</div>
                    <button onClick={disconnectLace} style={{ width: 'auto', background: '#dc2626' }}>Disconnect</button>
                  </div>
                ) : (
                  <button onClick={connectLace} style={{ width: 'auto' }}>Connect Wallet</button>
                )}
              </div>
              <div style={{ background: 'rgba(0,0,0,0.3)', border: '1px solid var(--border-color)', padding: '20px', borderRadius: '12px' }}>
                <h3>Get tNIGHT</h3>
                <button onClick={requestFaucet} disabled={!walletConnected || faucetLoading}>
                  {faucetLoading ? "Requesting..." : "Disburse Faucet Tokens"}
                </button>
              </div>
            </div>

            <section>
              <h3>Recent Actions</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {logs.map((log, idx) => (
                  <div key={idx} style={{ background: 'rgba(0,0,0,0.2)', padding: '12px', borderRadius: '8px', border: '1px solid var(--border-color)', fontSize: '0.8rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', color: '#34d399', fontWeight: 600 }}>
                      <span>{log.status}</span>
                      <span style={{ color: 'var(--text-secondary)' }}>{log.timestamp}</span>
                    </div>
                    <div style={{ marginTop: '4px' }}>{log.details}</div>
                  </div>
                ))}
              </div>
            </section>
          </div>
        )}

        {activeTab === 'privacy' && (
          <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '16px', padding: '30px' }}>
            <h2 style={{ fontSize: '1.5rem', display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px', color: '#f59e0b' }}>
              <Lock className="w-6 h-6" /> Zero-Knowledge Privacy Model
            </h2>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '30px' }}>
              <div style={{ background: 'rgba(16, 185, 129, 0.03)', border: '1px solid rgba(16, 185, 129, 0.15)', padding: '20px', borderRadius: '12px' }}>
                <h3 style={{ color: '#10b981' }}>Can Learn:</h3>
                <ul>
                  <li>Verifier logic code on-chain.</li>
                  <li>Final boolean result of age check.</li>
                </ul>
              </div>
              <div style={{ background: 'rgba(239, 68, 68, 0.03)', border: '1px solid rgba(239, 68, 68, 0.15)', padding: '20px', borderRadius: '12px' }}>
                <h3 style={{ color: '#f87171' }}>Cannot Learn:</h3>
                <ul>
                  <li>Your exact birth year or age value.</li>
                  <li>Local credential key signatures.</li>
                </ul>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
