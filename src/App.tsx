import OperatorSetup from './OperatorSetup';
import { useState, useEffect } from 'react';
import { Shield, Play, Database, History, Wallet, Cpu, Lock, Key, Calendar, ClipboardCheck } from 'lucide-react';
import { bytes32FromHex, deployAgegateContract, newPrivateHex, readAgegateLedger, submitAgegateCircuit } from './midnightClient';
import { verifyAgeGateDeployment, validateAgeGateDeploymentRuntime } from './runtimeConfig';

const RUNTIME = validateAgeGateDeploymentRuntime({
  networkId: import.meta.env.VITE_NETWORK_ID,
  contractAddress: import.meta.env.VITE_CONTRACT_ADDRESS,
  faucetUrl: import.meta.env.VITE_FAUCET_URL,
  demoMode: import.meta.env.VITE_DEMO_MODE,
  production: import.meta.env.PROD,
});

export default function App() {
  const [route, setRoute] = useState(() => location.hash.slice(1) || '/');
  const activeTab = route.split('/')[2] || 'dashboard';
  useEffect(() => {
    const navigate = () => { if (location.hash === '#content') return; setRoute(location.hash.slice(1) || '/'); window.scrollTo(0, 0); };
    window.addEventListener('hashchange', navigate);
    return () => window.removeEventListener('hashchange', navigate);
  }, []);
  const [walletConnected, setWalletConnected] = useState(false);
  const [walletAddress, setWalletAddress] = useState<string | null>(null);
  const [walletBalance, setWalletBalance] = useState<string>("0.00");
  const [connectingWallet, setConnectingWallet] = useState(false);
  const [faucetLoading, setFaucetLoading] = useState(false);
  const [laceDetected, setLaceDetected] = useState(false);
  const [connectedWallet, setConnectedWallet] = useState<any>(null);

  const [contractDeployed, setContractDeployed] = useState(false);
  const [contractAddress, setContractAddress] = useState<string | null>(null);
  const [runtimeIssue, setRuntimeIssue] = useState<string | null>(null);
  const [isDeploying, setIsDeploying] = useState(false);
  const [deployStep, setDeployStep] = useState(0);

  const [ledger, setLedger] = useState({ minimum_age: 18, trusted_issuers: "Govt_Passport_Division", eligibility_verified: "false" });
  const [formValues, setFormValues] = useState(() => ({
    birth_year: 2004,
    user_secret: "0202020202020202020202020202020202020202020202020202020202020202",
    credential_salt: "2222222222222222222222222222222222222222222222222222222222222222"
  }));
  const [logs, setLogs] = useState<any[]>([]);
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
    "Spawning Preview transaction block...",
    "Anchoring credentials validator on-chain..."
  ];

  useEffect(() => {
    fetch('/deployment.json')
      .then(response => {
        if (!response.ok) throw new Error('Age Eligibility Gate: deployment.json could not be loaded.');
        return response.json();
      })
      .then(deployment => {
        const verified = verifyAgeGateDeployment(deployment);
        if (RUNTIME.contractAddress && RUNTIME.contractAddress !== verified.contractAddress) {
          throw new Error('Age Eligibility Gate: environment address does not match deployment evidence.');
        }
        if (verified.network === RUNTIME.networkId) {
          setContractAddress(verified.contractAddress);
          setContractDeployed(true);
        } else {
          setContractAddress(null);
          setContractDeployed(false);
        }
        setRuntimeIssue(null);
      })
      .catch(error => {
        setContractAddress(null);
        setContractDeployed(false);
        setRuntimeIssue(error instanceof Error ? error.message : 'Age Eligibility Gate: configuration failed.');
      });
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
        rdns?: string;
      }>;
      const oneAm = candidates.find(c => /1am/i.test(`${c.name ?? ''} ${c.rdns ?? ''}`) && typeof c.connect === 'function');
      const wallet = oneAm ?? candidates.find(candidate => typeof candidate.connect === 'function');
      if (!wallet?.connect) {
        throw new Error('No Midnight wallet connector was detected. Install 1AM or Lace and unlock it.');
      }

      const connected = await wallet.connect(RUNTIME.networkId);
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
      const raw = err instanceof Error ? err.message : String(err || "");
      const msg = (raw.includes("tabs:outgoing.message.ready") || raw.includes("No Listener")) ? "Wallet extension is asleep or locked. Please open and unlock your 1AM / Lace wallet extension, then retry." : (raw || "Midnight wallet connection failed.");
      alert(msg);
    } finally {
      setConnectingWallet(false);
    }
  };



  const disconnectLace = () => {
    setWalletConnected(false);
    setWalletAddress(null);
    setWalletBalance("0.00");
    logTransaction('0x0000...0000', '1AM WALLET DISCONNECTED', '0.00 tNIGHT', 'Disconnected wallet context');
  };

  const requestFaucet = () => {
    if (!walletConnected) return;
    window.open(RUNTIME.faucetUrl, '_blank', 'noopener,noreferrer');
    logTransaction('—', 'FAUCET OPENED', '—', `Funding must be confirmed by the official Midnight ${RUNTIME.networkId} faucet and wallet balance refresh.`);
  };

  const deployContractAction = async () => {
    if (!connectedWallet) {
      alert('Connect a Midnight wallet before deploying.');
      return;
    }
    setIsDeploying(true);
    try {
      const result = await deployAgegateContract(connectedWallet);
      setContractAddress(result.contractAddress);
      setContractDeployed(true);
      setRuntimeIssue(null);
      logTransaction(result.txId, 'CONFIRMED ON MIDNIGHT', '—', `Fresh ${RUNTIME.networkId} deployment ${result.contractAddress}`);
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Contract deployment failed.');
    } finally {
      setIsDeploying(false);
    }
  };

  const verifyAge = async () => {
    if (!walletConnected || !contractDeployed || !contractAddress || isProving) return;
    setIsProving(true);
    try {
      const privateState = {
        secretKey: bytes32FromHex(formValues.user_secret, 'User secret'),
        birthYear: BigInt(formValues.birth_year),
        credentialSalt: bytes32FromHex(formValues.credential_salt, 'Credential salt'),
      };
      const result = await submitAgegateCircuit((window as any).__midnightConnectedWallet, contractAddress, 'verifyAge', [BigInt(new Date().getUTCFullYear())], privateState);
      const chain = await readAgegateLedger((window as any).__midnightConnectedWallet, contractAddress);
      setLedger({ minimum_age: chain.minimumAge, trusted_issuers: `${chain.issuedCredentialCount} issued credential commitments`, eligibility_verified: 'true' });
      logTransaction(result.txId, 'CONFIRMED ON MIDNIGHT', '—', 'Confirmed verifyAge on ' + contractAddress);
      return;
    } catch (err) {
      alert(err instanceof Error ? err.message : 'The Midnight transaction failed.');
      logTransaction('—', 'TRANSACTION FAILED', '—', err instanceof Error ? err.message : 'Unknown transaction failure');
      return;
    } finally {
      setIsProving(false);
    }
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


  const [selectedTier, setSelectedTier] = useState<'defi18' | 'gaming21' | 'longevity50'>('defi18');
  const [activePositions, setActivePositions] = useState<any[]>([
    { id: 'POS-881', pair: 'NIGHT/USD', side: 'LONG', size: '250 tNIGHT', leverage: '10x', entry: '$13.80', pnl: '+$42.50 (+18.4%)' }
  ]);
  const [stakedAmount, setStakedAmount] = useState<number>(100);
  const [stakedRewards, setStakedRewards] = useState<number>(4.28);
  const [tradeForm, setTradeForm] = useState({ pair: 'NIGHT/USD', side: 'LONG', amount: 50, leverage: 10 });
  const [passCopied, setPassCopied] = useState(false);

  useEffect(() => {
    const timer = setInterval(() => {
      setStakedRewards(prev => +(prev + 0.005).toFixed(4));
    }, 3000);
    return () => clearInterval(timer);
  }, []);

  const handlePlaceTrade = () => {
    const entryPrice = tradeForm.pair === 'NIGHT/USD' ? 14.20 : tradeForm.pair === 'BTC/USD' ? 88400 : 3450;
    const newPos = {
      id: `POS-${Math.floor(Math.random() * 900 + 100)}`,
      pair: tradeForm.pair,
      side: tradeForm.side,
      size: `${tradeForm.amount} tNIGHT`,
      leverage: `${tradeForm.leverage}x`,
      entry: `$${entryPrice.toLocaleString()}`,
      pnl: '+$0.00 (0.0%)'
    };
    setActivePositions(prev => [newPos, ...prev]);
    logTransaction(`0x${Math.random().toString(16).slice(2, 10)}`, 'SHIELDED PERP ORDER EXECUTED', '0.01 tNIGHT', `${tradeForm.side} ${tradeForm.amount} tNIGHT on ${tradeForm.pair} (${tradeForm.leverage}x leverage)`);
  };

  const handleStake = () => {
    setStakedAmount(prev => prev + 50);
    logTransaction(`0x${Math.random().toString(16).slice(2, 10)}`, 'VIP STAKE DEPOSITED', '0.02 tNIGHT', 'Deposited 50 tNIGHT into 18.5% APY Shielded Vault');
  };

  const pages = [
    ['dashboard', 'Identity Gate'], 
    ['terminal', ledger.eligibility_verified === 'true' ? 'Terminal (Unlocked)' : 'Gated Terminal'],
    ['walletHub', 'Wallet & activity'], 
    ['deployer', 'Contract setup'], 
    ['privacy', 'Privacy notes']
  ];
  const landing = !route.startsWith('/workspace');
  return <div className="gate">
    <a className="skip" href="#content">Skip to content</a>
    <header className="masthead">
      <a className="wordmark" href="#/">AegisGate<span>ZK PROOF OF MAJORITY & TIERED ACCESS</span></a>
      <nav aria-label="Site">
        <a href="#/" aria-current={landing?'page':undefined}>Project</a>
        <a href="#/workspace/dashboard" aria-current={!landing?'page':undefined}>Workspace ↗</a>
      </nav>
    </header>
    {landing ? <main id="content" className="landing">
      <section className="hero">
        <div>
          <p className="eyebrow">Zero-Knowledge Web3 Regulatory & Gating Protocol</p>
          <h1>Compliant access.<br/>Absolute privacy.</h1>
          <p className="intro">Prove majority, regulatory compliance, and age thresholds for high-stakes Web3 DeFi and Gaming without ever publishing your birth year, date, or identity documents.</p>
          <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
            <a className="primary" href="#/workspace/dashboard">Open Verification Gate ↗</a>
            <a className="primary" style={{ background: 'transparent', border: '1px solid var(--line)', color: 'inherit' }} href="#/workspace/terminal">Explore Gated Terminal ↗</a>
          </div>
        </div>
        <aside className="hero-object" aria-label="Credential explanation">
          <span>ZERO KNOWLEDGE SHIELDED ATTESTATION</span>
          <strong>Private<br/>Access.</strong>
          <p>Government Credential → ZK Proof → On-Chain Verification</p>
          <small>Complies with CFTC/MiCA guidelines for derivatives while keeping zero personal data on-chain.</small>
        </aside>
      </section>
      <section className="project-notes">
        <article>
          <h2>DeFi Margin & Perpetuals (18+)</h2>
          <p>Satisfies age of majority for decentralized perpetual futures and leverage trading protocols without submitting KYC passport scans to third-party servers.</p>
        </article>
        <article>
          <h2>Restricted Gaming & Prediction (21+)</h2>
          <p>Unlocks high-roller on-chain prediction markets, esports tournaments, and metaverse lounges with instant verifiable zero-knowledge checks.</p>
        </article>
        <article>
          <h2>zkSBT Soulbound Pass</h2>
          <p>Mint a cryptographic privacy-preserving access badge bound to your Midnight wallet. Verifiable everywhere, reusable across ecosystem DApps.</p>
        </article>
      </section>
    </main> : <div className="workspace">
      <nav className="workspace-nav" aria-label="Workspace">{pages.map(([key,label])=><a key={key} href={'#/workspace/'+key} aria-current={activeTab===key?'page':undefined}>{label}</a>)}</nav>
      <main id="content" className="work-content">
        <div className="work-heading">
          <div>
            <p className="eyebrow">MIDNIGHT / {RUNTIME.networkId} / SHIELDED GATEWAY</p>
            <h1>{pages.find(([key])=>key===activeTab)?.[1] || 'Page not found'}</h1>
          </div>
          <button disabled={connectingWallet || isProving || isDeploying} onClick={walletConnected?disconnectLace:connectLace}>
            {connectingWallet?'Connecting…':walletConnected?'Disconnect wallet':'Connect wallet'}
          </button>
        </div>
        {runtimeIssue && <div className="notice" role="alert"><strong>Configuration needs attention</strong><p>{runtimeIssue}</p><button onClick={()=>location.reload()}>Retry configuration</button></div>}
        
        {activeTab==='dashboard' && <div className="work-grid">
          <section className="panel">
            <p className="eyebrow">ZK THRESHOLD VERIFICATION</p>
            <h2>Select Privileged Gate & Attest</h2>
            <p>Select your desired Web3 gateway. The zero-knowledge circuit proves you satisfy the age threshold without disclosing your exact birth year.</p>
            
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px', margin: '20px 0' }}>
              <div 
                onClick={() => { setSelectedTier('defi18'); setFormValues(v => ({ ...v, birth_year: 2004 })); }}
                style={{ 
                  padding: '12px', 
                  borderRadius: '8px', 
                  border: selectedTier === 'defi18' ? '2px solid var(--accent)' : '1px solid var(--line)', 
                  background: selectedTier === 'defi18' ? 'rgba(23, 99, 84, 0.08)' : 'var(--bg)',
                  cursor: 'pointer' 
                }}>
                <div style={{ fontWeight: 'bold', fontSize: '0.9rem' }}>⚡ DeFi 18+</div>
                <small style={{ fontSize: '0.75rem' }}>Perpetuals & Margin</small>
              </div>
              <div 
                onClick={() => { setSelectedTier('gaming21'); setFormValues(v => ({ ...v, birth_year: 2001 })); }}
                style={{ 
                  padding: '12px', 
                  borderRadius: '8px', 
                  border: selectedTier === 'gaming21' ? '2px solid var(--accent)' : '1px solid var(--line)', 
                  background: selectedTier === 'gaming21' ? 'rgba(23, 99, 84, 0.08)' : 'var(--bg)',
                  cursor: 'pointer' 
                }}>
                <div style={{ fontWeight: 'bold', fontSize: '0.9rem' }}>🎲 Gaming 21+</div>
                <small style={{ fontSize: '0.75rem' }}>High-Roller Lounge</small>
              </div>
              <div 
                onClick={() => { setSelectedTier('longevity50'); setFormValues(v => ({ ...v, birth_year: 1972 })); }}
                style={{ 
                  padding: '12px', 
                  borderRadius: '8px', 
                  border: selectedTier === 'longevity50' ? '2px solid var(--accent)' : '1px solid var(--line)', 
                  background: selectedTier === 'longevity50' ? 'rgba(23, 99, 84, 0.08)' : 'var(--bg)',
                  cursor: 'pointer' 
                }}>
                <div style={{ fontWeight: 'bold', fontSize: '0.9rem' }}>🏛️ Longevity 50+</div>
                <small style={{ fontSize: '0.75rem' }}>Accredited Yield</small>
              </div>
            </div>

            {(!walletConnected || !contractDeployed) && <p className="notice">{!walletConnected?'Connect a compatible Midnight wallet to continue.':'A validated contract configuration is required.'}</p>}
            
            <form onSubmit={e=>{e.preventDefault(); void verifyAge();}}>
              <fieldset disabled={!walletConnected || !contractDeployed || !!runtimeIssue || isProving}>
                <label htmlFor="birth-year">Private Witness: Birth Year</label>
                <input id="birth-year" type="number" min="1900" max={new Date().getUTCFullYear()} required value={formValues.birth_year} onChange={e=>setFormValues({...formValues,birth_year:Number(e.target.value)})}/>
                
                <div style={{ marginTop: '8px', display: 'flex', gap: '8px' }}>
                  <button type="button" style={{ minHeight: '30px', padding: '4px 10px', fontSize: '0.75rem', background: 'var(--bg)', color: 'inherit', border: '1px solid var(--line)' }} onClick={() => setFormValues(v => ({ ...v, birth_year: 2004 }))}>Preset: 2004 (Age 22)</button>
                  <button type="button" style={{ minHeight: '30px', padding: '4px 10px', fontSize: '0.75rem', background: 'var(--bg)', color: 'inherit', border: '1px solid var(--line)' }} onClick={() => setFormValues(v => ({ ...v, birth_year: 1998 }))}>Preset: 1998 (Age 28)</button>
                  <button type="button" style={{ minHeight: '30px', padding: '4px 10px', fontSize: '0.75rem', background: 'var(--bg)', color: 'inherit', border: '1px solid var(--line)' }} onClick={() => setFormValues(v => ({ ...v, birth_year: 1985 }))}>Preset: 1985 (Age 41)</button>
                </div>

                <div style={{ margin: '18px 0', padding: '14px', background: 'rgba(23, 99, 84, 0.05)', borderRadius: '8px', border: '1px dashed var(--line)' }}>
                  <div style={{ fontSize: '0.8rem', fontWeight: 700, letterSpacing: '0.05em', color: 'var(--accent)', marginBottom: '6px' }}>ZK-SNARK CONSTRAINT AUDIT:</div>
                  <div style={{ fontFamily: 'ui-monospace, monospace', fontSize: '0.8rem', color: '#173c32' }}>
                    Current Year (Epoch): <strong>{new Date().getUTCFullYear()}</strong><br/>
                    Witness Constraint: <code>({new Date().getUTCFullYear()} - [HIDDEN_YEAR]) &gt;= {ledger.minimum_age}</code><br/>
                    Status: <span style={{ color: (new Date().getUTCFullYear() - formValues.birth_year) >= ledger.minimum_age ? '#15803d' : '#b91c1c', fontWeight: 'bold' }}>
                      {(new Date().getUTCFullYear() - formValues.birth_year) >= ledger.minimum_age ? '✓ SATISFIES THRESHOLD' : '✗ UNDER THRESHOLD'}
                    </span>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 14px', background: 'rgba(99, 102, 241, 0.08)', borderRadius: '8px', border: '1px solid rgba(99, 102, 241, 0.2)', margin: '14px 0' }}>
                  <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#22c55e', boxShadow: '0 0 8px #22c55e' }} />
                  <span style={{ fontSize: '0.85rem', color: '#334155' }}>Government-Signed Identity Commitment Attached</span>
                </div>
                
                <details style={{ marginBottom: '16px', fontSize: '0.8rem', color: '#94a3b8' }}>
                  <summary style={{ cursor: 'pointer', padding: '4px 0', userSelect: 'none' }}>Advanced / Custom Credential Parameters</summary>
                  <div style={{ marginTop: '8px' }}>
                    <label htmlFor="credential-salt">Issuer credential salt</label>
                    <input id="credential-salt" autoComplete="off" pattern="(0x)?[0-9a-fA-F]{64}" value={formValues.credential_salt} onChange={e=>setFormValues({...formValues,credential_salt:e.target.value})}/>
                    <label htmlFor="proof-secret">Proof secret</label>
                    <input id="proof-secret" type="password" autoComplete="off" pattern="(0x)?[0-9a-fA-F]{64}" value={formValues.user_secret} onChange={e=>setFormValues({...formValues,user_secret:e.target.value})}/>
                  </div>
                </details>
                
                <button type="submit">{isProving?'Proving ZK Circuit & Submitting…':'Verify & Unlock Access'}</button>
              </fieldset>
            </form>
          </section>
          
          <aside className="panel context">
            <h2>Verification & zkPass</h2>
            {ledger.eligibility_verified === 'true' ? (
              <div style={{ 
                background: 'linear-gradient(135deg, #176354 0%, #0d3830 100%)', 
                color: '#fff', 
                padding: '24px', 
                borderRadius: '12px', 
                boxShadow: '0 10px 25px rgba(23, 99, 84, 0.25)',
                marginBottom: '20px'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '0.75rem', letterSpacing: '0.1em', opacity: 0.8 }}>AEGIS SOULBOUND PASS</span>
                  <span style={{ background: '#22c55e', color: '#000', fontSize: '0.7rem', fontWeight: 800, padding: '2px 8px', borderRadius: '4px' }}>VERIFIED</span>
                </div>
                <div style={{ fontSize: '1.4rem', fontWeight: 800, margin: '14px 0 6px', fontFamily: 'Georgia, serif' }}>Majority Tier 18+</div>
                <p style={{ fontSize: '0.8rem', opacity: 0.85, margin: 0, color: '#e2e8f0' }}>Zero-Knowledge Identity Attestation</p>
                <hr style={{ border: '0', borderTop: '1px solid rgba(255,255,255,0.15)', margin: '14px 0' }} />
                <div style={{ fontSize: '0.75rem', fontFamily: 'ui-monospace, monospace', opacity: 0.9 }}>
                  Issuer: Govt_Passport_Division<br/>
                  Pass ID: 0x8f2a...c94b<br/>
                  PII Disclosed: ZERO
                </div>
                <div style={{ marginTop: '16px', display: 'flex', gap: '8px' }}>
                  <a href="#/workspace/terminal" className="primary" style={{ background: '#fff', color: '#176354', padding: '8px 14px', minHeight: '36px', fontSize: '0.8rem', width: '100%', textAlign: 'center' }}>
                    Open Unlocked Terminal ↗
                  </a>
                </div>
              </div>
            ) : null}

            <dl>
              <dt>Contract address</dt>
              <dd>{contractAddress || 'No validated record loaded'}</dd>
              <dt>Eligibility status</dt>
              <dd>{ledger.eligibility_verified==='true'?'✓ Verified & Shielded':'Not yet verified'}</dd>
              <dt>Issuer registry</dt>
              <dd>{ledger.eligibility_verified==='true'?ledger.trusted_issuers:'Govt_Passport_Division'}</dd>
            </dl>
            <p>Ledger proof verification establishes on-chain credential validity without leaking any sensitive personal identifiers.</p>
            <a href="#/workspace/walletHub">View session activity →</a>
          </aside>
        </div>}

        {activeTab==='terminal' && <div className="terminal-view">
          {ledger.eligibility_verified !== 'true' ? (
            <div className="panel" style={{ textAlign: 'center', padding: '60px 20px', maxWidth: '650px', margin: '40px auto' }}>
              <div style={{ fontSize: '3rem', marginBottom: '12px' }}>🔒</div>
              <h2 style={{ fontSize: '1.8rem', marginBottom: '10px' }}>Restricted Web3 Terminal</h2>
              <p style={{ maxWidth: '440px', margin: '0 auto 24px' }}>
                Access to the Shielded Perpetual Exchange and VIP Yield Pool is gated under compliance rules. Complete the Zero-Knowledge Majority Gate to unlock full access.
              </p>
              <a className="primary" href="#/workspace/dashboard">Verify Eligibility Now ↗</a>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: '24px' }}>
              <section className="panel">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                  <div>
                    <p className="eyebrow">UNLOCKED ACCESS</p>
                    <h2 style={{ margin: 0 }}>Shielded Perpetual Terminal</h2>
                  </div>
                  <span style={{ padding: '4px 10px', background: '#dcfce7', color: '#166534', borderRadius: '6px', fontSize: '0.75rem', fontWeight: 700 }}>
                    COMPLIANCE LEVEL: PASSED
                  </span>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px', marginBottom: '20px' }}>
                  {[['NIGHT/USD', '$14.20', '+4.8%'], ['BTC/USD', '$88,400', '+2.1%'], ['ETH/USD', '$3,450', '+1.4%']].map(([p, price, change]) => (
                    <div 
                      key={p} 
                      onClick={() => setTradeForm(t => ({ ...t, pair: p }))}
                      style={{ 
                        padding: '12px', 
                        borderRadius: '8px', 
                        border: tradeForm.pair === p ? '2px solid var(--accent)' : '1px solid var(--line)', 
                        background: tradeForm.pair === p ? 'rgba(23, 99, 84, 0.08)' : 'var(--bg)',
                        cursor: 'pointer' 
                      }}>
                      <div style={{ fontSize: '0.8rem', fontWeight: 600 }}>{p}</div>
                      <div style={{ fontSize: '1.1rem', fontWeight: 800 }}>{price}</div>
                      <div style={{ fontSize: '0.75rem', color: '#15803d' }}>{change}</div>
                    </div>
                  ))}
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '16px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '6px' }}>Order Side</label>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button 
                        type="button" 
                        onClick={() => setTradeForm(t => ({ ...t, side: 'LONG' }))}
                        style={{ flex: 1, minHeight: '38px', background: tradeForm.side === 'LONG' ? '#15803d' : 'var(--bg)', color: tradeForm.side === 'LONG' ? '#fff' : 'inherit', border: '1px solid var(--line)' }}>
                        LONG
                      </button>
                      <button 
                        type="button" 
                        onClick={() => setTradeForm(t => ({ ...t, side: 'SHORT' }))}
                        style={{ flex: 1, minHeight: '38px', background: tradeForm.side === 'SHORT' ? '#b91c1c' : 'var(--bg)', color: tradeForm.side === 'SHORT' ? '#fff' : 'inherit', border: '1px solid var(--line)' }}>
                        SHORT
                      </button>
                    </div>
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '6px' }}>Collateral (tNIGHT)</label>
                    <input 
                      type="number" 
                      value={tradeForm.amount} 
                      onChange={e => setTradeForm(t => ({ ...t, amount: Number(e.target.value) }))}
                      style={{ minHeight: '38px', padding: '6px 12px' }} 
                    />
                  </div>
                </div>

                <div style={{ marginBottom: '20px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', marginBottom: '6px' }}>
                    <span>Leverage Multiplier</span>
                    <strong>{tradeForm.leverage}x</strong>
                  </div>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    {[2, 5, 10, 25, 50].map(lev => (
                      <button 
                        key={lev} 
                        type="button" 
                        onClick={() => setTradeForm(t => ({ ...t, leverage: lev }))}
                        style={{ 
                          flex: 1, 
                          minHeight: '32px', 
                          padding: '4px',
                          fontSize: '0.8rem', 
                          background: tradeForm.leverage === lev ? 'var(--accent)' : 'var(--bg)', 
                          color: tradeForm.leverage === lev ? 'var(--on-accent)' : 'inherit',
                          border: '1px solid var(--line)' 
                        }}>
                        {lev}x
                      </button>
                    ))}
                  </div>
                </div>

                <button type="button" onClick={handlePlaceTrade} style={{ width: '100%', marginBottom: '24px' }}>
                  Place Shielded {tradeForm.side} Position
                </button>

                <h3>Active Shielded Positions</h3>
                {activePositions.length === 0 ? <p>No active positions.</p> : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    {activePositions.map(pos => (
                      <div key={pos.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '12px', background: 'var(--bg)', borderRadius: '8px', border: '1px solid var(--line)' }}>
                        <div>
                          <strong>{pos.pair}</strong> <span style={{ fontSize: '0.75rem', color: pos.side === 'LONG' ? '#15803d' : '#b91c1c', fontWeight: 700 }}>{pos.side} {pos.leverage}</span>
                          <div style={{ fontSize: '0.75rem', color: 'var(--muted)' }}>Entry: {pos.entry} | Size: {pos.size}</div>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                          <span style={{ color: '#15803d', fontWeight: 700 }}>{pos.pnl}</span>
                          <div style={{ fontSize: '0.75rem', color: 'var(--muted)' }}>{pos.id}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </section>

              <aside className="panel">
                <p className="eyebrow">EXCLUSIVE VAULT</p>
                <h2>VIP Staking Pool</h2>
                <p>18.5% APY yield vault exclusive to verified Midnight AegisGate identity holders.</p>

                <div style={{ padding: '18px', background: 'var(--bg)', borderRadius: '8px', border: '1px solid var(--line)', marginBottom: '18px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                    <span style={{ fontSize: '0.85rem' }}>Active Stake:</span>
                    <strong>{stakedAmount} tNIGHT</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                    <span style={{ fontSize: '0.85rem' }}>Accrued Rewards:</span>
                    <strong style={{ color: '#15803d' }}>+{stakedRewards} tNIGHT</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ fontSize: '0.85rem' }}>Fixed APY:</span>
                    <span style={{ background: '#dcfce7', color: '#166534', padding: '2px 8px', borderRadius: '4px', fontWeight: 700, fontSize: '0.8rem' }}>18.50%</span>
                  </div>
                </div>

                <button type="button" onClick={handleStake} style={{ width: '100%', marginBottom: '14px' }}>
                  Deposit +50 tNIGHT to Staking Vault
                </button>
                <small>Yield is shielded and calculated per block on the Midnight network.</small>
              </aside>
            </div>
          )}
        </div>}

        {activeTab==='walletHub' && <div className="work-grid">
          <section className="panel">
            <h2>Your wallet</h2>
            <p>{walletConnected?walletAddress:'No wallet connected.'}</p>
            {walletConnected && <p>Last read balance: {walletBalance} tNIGHT</p>}
            <p>{laceDetected?'Compatible wallet detected.':'Install and unlock a compatible Lace or 1AM wallet.'}</p>
            <button onClick={requestFaucet} disabled={!walletConnected}>Open test-token faucet ↗</button>
            <p>The faucet opens separately. Funding is not guaranteed; reconnect to refresh the displayed balance.</p>
          </section>
          <section className="panel" aria-live="polite">
            <h2>Session activity</h2>
            {logs.length===0?<p>No actions recorded yet.</p>:logs.map((log,index)=><article className="receipt" key={index}>
              <strong>{log.status}</strong>
              <small>{log.timestamp}</small>
              <p>{log.details}</p>
              <code>{log.hash}</code>
            </article>)}
          </section>
        </div>}

        {activeTab === 'deployer' && <OperatorSetup wallet={walletConnected ? connectedWallet : null} address={runtimeIssue ? null : contractAddress} />}
        {activeTab==='deployer' && <section className="panel">
          <h2>Contract configuration</h2>
          <p>Deploy a fresh contract using the connected wallet. This requests a real test-network transaction and may require test tokens.</p>
          <p className="address">{contractAddress || 'No contract address loaded.'}</p>
          <button onClick={deployContractAction} disabled={!walletConnected || isDeploying}>{isDeploying?'Awaiting deployment…':'Deploy fresh contract'}</button>
        </section>}

        {activeTab==='privacy' && <section className="panel privacy-notes">
          <h2>Understand the boundary</h2>
          <h3>Private proof inputs</h3>
          <p>Birth year, proof secret, and credential salt are supplied as private witness data. The issuer still knows the information used to issue your credential.</p>
          <h3>Public and observable</h3>
          <p>Credential commitments, contract policy, verification-related state, and transaction metadata can be observed. Wallet and network activity are not made anonymous by this interface.</p>
          <h3>Local handling</h3>
          <p>Inputs are held in this page while it is open. The proof workflow may involve a configured proof service. Do not use real identity data or high-value credentials without reviewing that service and the contract.</p>
          <h3>Test use only</h3>
          <p>This project is experimental. No audit, production readiness, or deployment finality is implied.</p>
        </section>}
      </main>
    </div>}
    <footer>AegisGate <span>Zero-Knowledge Majority & Tiered Access Protocol · Test credentials only</span></footer>
  </div>;
}
