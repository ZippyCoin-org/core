#!/bin/bash
set -e

psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" <<-EOSQL
    -- Create databases for each service
    CREATE DATABASE trust_engine;
    CREATE DATABASE wallet_service;
    CREATE DATABASE governance_service;
    CREATE DATABASE defi_service;
    CREATE DATABASE nft_service;
    CREATE DATABASE bridge_service;
    CREATE DATABASE node_service;

    -- Create users for each service
    CREATE USER trust WITH PASSWORD 'password';
    CREATE USER wallet WITH PASSWORD 'password';
    CREATE USER governance WITH PASSWORD 'password';
    CREATE USER defi WITH PASSWORD 'password';
    CREATE USER nft WITH PASSWORD 'password';
    CREATE USER bridge WITH PASSWORD 'password';
    CREATE USER node WITH PASSWORD 'password';

    -- Grant privileges
    GRANT ALL PRIVILEGES ON DATABASE trust_engine TO trust;
    GRANT ALL PRIVILEGES ON DATABASE wallet_service TO wallet;
    GRANT ALL PRIVILEGES ON DATABASE governance_service TO governance;
    GRANT ALL PRIVILEGES ON DATABASE defi_service TO defi;
    GRANT ALL PRIVILEGES ON DATABASE nft_service TO nft;
    GRANT ALL PRIVILEGES ON DATABASE bridge_service TO bridge;
    GRANT ALL PRIVILEGES ON DATABASE node_service TO node;

    -- Grant schema privileges
    GRANT ALL ON SCHEMA public TO trust;
    GRANT ALL ON SCHEMA public TO wallet;
    GRANT ALL ON SCHEMA public TO governance;
    GRANT ALL ON SCHEMA public TO defi;
    GRANT ALL ON SCHEMA public TO nft;
    GRANT ALL ON SCHEMA public TO bridge;
    GRANT ALL ON SCHEMA public TO node;
EOSQL

# Initialize Trust Engine database
psql -v ON_ERROR_STOP=1 --username "trust" --dbname "trust_engine" <<-EOSQL
    -- Trust Engine tables
    CREATE TABLE IF NOT EXISTS trust_scores (
        id SERIAL PRIMARY KEY,
        address VARCHAR(42) NOT NULL UNIQUE,
        trust_score INTEGER NOT NULL DEFAULT 50,
        trust_factors JSONB NOT NULL DEFAULT '{}',
        last_updated TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS trust_events (
        id SERIAL PRIMARY KEY,
        address VARCHAR(42) NOT NULL,
        event_type VARCHAR(50) NOT NULL,
        event_data JSONB NOT NULL DEFAULT '{}',
        trust_impact INTEGER NOT NULL DEFAULT 0,
        timestamp TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS trust_delegations (
        id SERIAL PRIMARY KEY,
        delegator VARCHAR(42) NOT NULL,
        delegatee VARCHAR(42) NOT NULL,
        amount BIGINT NOT NULL,
        trust_multiplier DECIMAL(5,2) NOT NULL DEFAULT 1.0,
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        expires_at TIMESTAMP
    );

    -- Indexes
    CREATE INDEX IF NOT EXISTS idx_trust_scores_address ON trust_scores(address);
    CREATE INDEX IF NOT EXISTS idx_trust_scores_score ON trust_scores(trust_score);
    CREATE INDEX IF NOT EXISTS idx_trust_events_address ON trust_events(address);
    CREATE INDEX IF NOT EXISTS idx_trust_events_type ON trust_events(event_type);
    CREATE INDEX IF NOT EXISTS idx_trust_delegations_delegator ON trust_delegations(delegator);
    CREATE INDEX IF NOT EXISTS idx_trust_delegations_delegatee ON trust_delegations(delegatee);
EOSQL

# Initialize Wallet Service database
psql -v ON_ERROR_STOP=1 --username "wallet" --dbname "wallet_service" <<-EOSQL
    -- Wallet Service tables
    CREATE TABLE IF NOT EXISTS wallets (
        id SERIAL PRIMARY KEY,
        address VARCHAR(42) NOT NULL UNIQUE,
        public_key VARCHAR(130) NOT NULL,
        encrypted_private_key TEXT NOT NULL,
        derivation_path VARCHAR(100),
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        last_accessed TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS transactions (
        id SERIAL PRIMARY KEY,
        hash VARCHAR(66) NOT NULL UNIQUE,
        from_address VARCHAR(42) NOT NULL,
        to_address VARCHAR(42) NOT NULL,
        amount BIGINT NOT NULL,
        fee BIGINT NOT NULL,
        nonce INTEGER NOT NULL,
        status VARCHAR(20) NOT NULL DEFAULT 'pending',
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        confirmed_at TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS multisig_wallets (
        id SERIAL PRIMARY KEY,
        address VARCHAR(42) NOT NULL UNIQUE,
        required_signatures INTEGER NOT NULL,
        total_signatures INTEGER NOT NULL,
        owners JSONB NOT NULL,
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    -- Indexes
    CREATE INDEX IF NOT EXISTS idx_wallets_address ON wallets(address);
    CREATE INDEX IF NOT EXISTS idx_transactions_hash ON transactions(hash);
    CREATE INDEX IF NOT EXISTS idx_transactions_from ON transactions(from_address);
    CREATE INDEX IF NOT EXISTS idx_transactions_to ON transactions(to_address);
    CREATE INDEX IF NOT EXISTS idx_transactions_status ON transactions(status);
    CREATE INDEX IF NOT EXISTS idx_multisig_wallets_address ON multisig_wallets(address);
EOSQL

# Initialize Governance Service database
psql -v ON_ERROR_STOP=1 --username "governance" --dbname "governance_service" <<-EOSQL
    -- Governance Service tables
    CREATE TABLE IF NOT EXISTS proposals (
        id SERIAL PRIMARY KEY,
        proposal_id VARCHAR(66) NOT NULL UNIQUE,
        title VARCHAR(200) NOT NULL,
        description TEXT NOT NULL,
        proposal_type VARCHAR(50) NOT NULL,
        chamber VARCHAR(20) NOT NULL,
        author VARCHAR(42) NOT NULL,
        status VARCHAR(20) NOT NULL DEFAULT 'draft',
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        voting_start TIMESTAMP,
        voting_end TIMESTAMP,
        executed_at TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS votes (
        id SERIAL PRIMARY KEY,
        proposal_id VARCHAR(66) NOT NULL,
        voter VARCHAR(42) NOT NULL,
        vote_type VARCHAR(20) NOT NULL,
        voting_power BIGINT NOT NULL,
        reason TEXT,
        timestamp TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(proposal_id, voter)
    );

    CREATE TABLE IF NOT EXISTS origin_wallets (
        id SERIAL PRIMARY KEY,
        address VARCHAR(42) NOT NULL UNIQUE,
        country_code VARCHAR(3) NOT NULL,
        required_signatures INTEGER NOT NULL,
        stake_amount BIGINT NOT NULL,
        trust_score INTEGER NOT NULL DEFAULT 50,
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS token_holders (
        id SERIAL PRIMARY KEY,
        address VARCHAR(42) NOT NULL UNIQUE,
        balance BIGINT NOT NULL DEFAULT 0,
        voting_power BIGINT NOT NULL DEFAULT 0,
        delegated_to VARCHAR(42),
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        last_updated TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    -- Indexes
    CREATE INDEX IF NOT EXISTS idx_proposals_id ON proposals(proposal_id);
    CREATE INDEX IF NOT EXISTS idx_proposals_status ON proposals(status);
    CREATE INDEX IF NOT EXISTS idx_proposals_chamber ON proposals(chamber);
    CREATE INDEX IF NOT EXISTS idx_votes_proposal ON votes(proposal_id);
    CREATE INDEX IF NOT EXISTS idx_votes_voter ON votes(voter);
    CREATE INDEX IF NOT EXISTS idx_origin_wallets_address ON origin_wallets(address);
    CREATE INDEX IF NOT EXISTS idx_origin_wallets_country ON origin_wallets(country_code);
    CREATE INDEX IF NOT EXISTS idx_token_holders_address ON token_holders(address);
    CREATE INDEX IF NOT EXISTS idx_token_holders_balance ON token_holders(balance);
EOSQL

# Initialize DeFi Service database
psql -v ON_ERROR_STOP=1 --username "defi" --dbname "defi_service" <<-EOSQL
    -- DeFi Service tables
    CREATE TABLE IF NOT EXISTS staking_pools (
        id SERIAL PRIMARY KEY,
        pool_id VARCHAR(66) NOT NULL UNIQUE,
        name VARCHAR(100) NOT NULL,
        description TEXT,
        reward_rate DECIMAL(10,8) NOT NULL,
        total_staked BIGINT NOT NULL DEFAULT 0,
        total_rewards BIGINT NOT NULL DEFAULT 0,
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS stakes (
        id SERIAL PRIMARY KEY,
        staker VARCHAR(42) NOT NULL,
        pool_id VARCHAR(66) NOT NULL,
        amount BIGINT NOT NULL,
        trust_multiplier DECIMAL(5,2) NOT NULL DEFAULT 1.0,
        staked_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        unstaked_at TIMESTAMP,
        status VARCHAR(20) NOT NULL DEFAULT 'active'
    );

    CREATE TABLE IF NOT EXISTS rewards (
        id SERIAL PRIMARY KEY,
        staker VARCHAR(42) NOT NULL,
        pool_id VARCHAR(66) NOT NULL,
        amount BIGINT NOT NULL,
        trust_multiplier DECIMAL(5,2) NOT NULL DEFAULT 1.0,
        claimed_at TIMESTAMP,
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS liquidity_pools (
        id SERIAL PRIMARY KEY,
        pool_id VARCHAR(66) NOT NULL UNIQUE,
        token_a VARCHAR(42) NOT NULL,
        token_b VARCHAR(42) NOT NULL,
        reserve_a BIGINT NOT NULL DEFAULT 0,
        reserve_b BIGINT NOT NULL DEFAULT 0,
        total_supply BIGINT NOT NULL DEFAULT 0,
        fee_rate DECIMAL(10,8) NOT NULL DEFAULT 0.003,
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    -- Indexes
    CREATE INDEX IF NOT EXISTS idx_staking_pools_id ON staking_pools(pool_id);
    CREATE INDEX IF NOT EXISTS idx_stakes_staker ON stakes(staker);
    CREATE INDEX IF NOT EXISTS idx_stakes_pool ON stakes(pool_id);
    CREATE INDEX IF NOT EXISTS idx_stakes_status ON stakes(status);
    CREATE INDEX IF NOT EXISTS idx_rewards_staker ON rewards(staker);
    CREATE INDEX IF NOT EXISTS idx_rewards_pool ON rewards(pool_id);
    CREATE INDEX IF NOT EXISTS idx_liquidity_pools_id ON liquidity_pools(pool_id);
    CREATE INDEX IF NOT EXISTS idx_liquidity_pools_tokens ON liquidity_pools(token_a, token_b);
EOSQL

# Initialize NFT Service database
psql -v ON_ERROR_STOP=1 --username "nft" --dbname "nft_service" <<-EOSQL
    -- NFT Service tables
    CREATE TABLE IF NOT EXISTS nft_collections (
        id SERIAL PRIMARY KEY,
        collection_id VARCHAR(66) NOT NULL UNIQUE,
        name VARCHAR(100) NOT NULL,
        symbol VARCHAR(20) NOT NULL,
        description TEXT,
        creator VARCHAR(42) NOT NULL,
        max_supply BIGINT,
        total_supply BIGINT NOT NULL DEFAULT 0,
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS nfts (
        id SERIAL PRIMARY KEY,
        nft_id VARCHAR(66) NOT NULL UNIQUE,
        collection_id VARCHAR(66) NOT NULL,
        token_id BIGINT NOT NULL,
        owner VARCHAR(42) NOT NULL,
        metadata_uri TEXT,
        metadata JSONB,
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        last_transferred TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS nft_transfers (
        id SERIAL PRIMARY KEY,
        nft_id VARCHAR(66) NOT NULL,
        from_address VARCHAR(42),
        to_address VARCHAR(42) NOT NULL,
        transaction_hash VARCHAR(66) NOT NULL,
        timestamp TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS nft_credentials (
        id SERIAL PRIMARY KEY,
        credential_id VARCHAR(66) NOT NULL UNIQUE,
        owner VARCHAR(42) NOT NULL,
        credential_type VARCHAR(50) NOT NULL,
        issuer VARCHAR(42) NOT NULL,
        metadata JSONB NOT NULL,
        status VARCHAR(20) NOT NULL DEFAULT 'active',
        issued_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        expires_at TIMESTAMP
    );

    -- Indexes
    CREATE INDEX IF NOT EXISTS idx_nft_collections_id ON nft_collections(collection_id);
    CREATE INDEX IF NOT EXISTS idx_nft_collections_creator ON nft_collections(creator);
    CREATE INDEX IF NOT EXISTS idx_nfts_id ON nfts(nft_id);
    CREATE INDEX IF NOT EXISTS idx_nfts_collection ON nfts(collection_id);
    CREATE INDEX IF NOT EXISTS idx_nfts_owner ON nfts(owner);
    CREATE INDEX IF NOT EXISTS idx_nft_transfers_nft ON nft_transfers(nft_id);
    CREATE INDEX IF NOT EXISTS idx_nft_transfers_from ON nft_transfers(from_address);
    CREATE INDEX IF NOT EXISTS idx_nft_transfers_to ON nft_transfers(to_address);
    CREATE INDEX IF NOT EXISTS idx_nft_credentials_id ON nft_credentials(credential_id);
    CREATE INDEX IF NOT EXISTS idx_nft_credentials_owner ON nft_credentials(owner);
    CREATE INDEX IF NOT EXISTS idx_nft_credentials_type ON nft_credentials(credential_type);
EOSQL

# Initialize Bridge Service database
psql -v ON_ERROR_STOP=1 --username "bridge" --dbname "bridge_service" <<-EOSQL
    -- Bridge Service tables
    CREATE TABLE IF NOT EXISTS bridge_networks (
        id SERIAL PRIMARY KEY,
        network_id VARCHAR(50) NOT NULL UNIQUE,
        name VARCHAR(100) NOT NULL,
        chain_id INTEGER NOT NULL,
        rpc_url TEXT NOT NULL,
        explorer_url TEXT,
        native_token VARCHAR(42) NOT NULL,
        is_active BOOLEAN NOT NULL DEFAULT true,
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS bridge_tokens (
        id SERIAL PRIMARY KEY,
        network_id VARCHAR(50) NOT NULL,
        token_address VARCHAR(42) NOT NULL,
        symbol VARCHAR(20) NOT NULL,
        name VARCHAR(100) NOT NULL,
        decimals INTEGER NOT NULL,
        is_native BOOLEAN NOT NULL DEFAULT false,
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(network_id, token_address)
    );

    CREATE TABLE IF NOT EXISTS bridge_transactions (
        id SERIAL PRIMARY KEY,
        transaction_id VARCHAR(66) NOT NULL UNIQUE,
        from_network VARCHAR(50) NOT NULL,
        to_network VARCHAR(50) NOT NULL,
        from_token VARCHAR(42) NOT NULL,
        to_token VARCHAR(42) NOT NULL,
        amount BIGINT NOT NULL,
        output_amount BIGINT NOT NULL,
        sender VARCHAR(42) NOT NULL,
        recipient VARCHAR(42) NOT NULL,
        status VARCHAR(20) NOT NULL DEFAULT 'pending',
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        completed_at TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS bridge_routes (
        id SERIAL PRIMARY KEY,
        route_id VARCHAR(66) NOT NULL UNIQUE,
        from_network VARCHAR(50) NOT NULL,
        to_network VARCHAR(50) NOT NULL,
        from_token VARCHAR(42) NOT NULL,
        to_token VARCHAR(42) NOT NULL,
        fee_rate DECIMAL(10,8) NOT NULL,
        min_amount BIGINT NOT NULL,
        max_amount BIGINT NOT NULL,
        is_active BOOLEAN NOT NULL DEFAULT true,
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    -- Indexes
    CREATE INDEX IF NOT EXISTS idx_bridge_networks_id ON bridge_networks(network_id);
    CREATE INDEX IF NOT EXISTS idx_bridge_tokens_network ON bridge_tokens(network_id);
    CREATE INDEX IF NOT EXISTS idx_bridge_tokens_address ON bridge_tokens(token_address);
    CREATE INDEX IF NOT EXISTS idx_bridge_transactions_id ON bridge_transactions(transaction_id);
    CREATE INDEX IF NOT EXISTS idx_bridge_transactions_sender ON bridge_transactions(sender);
    CREATE INDEX IF NOT EXISTS idx_bridge_transactions_status ON bridge_transactions(status);
    CREATE INDEX IF NOT EXISTS idx_bridge_routes_id ON bridge_routes(route_id);
    CREATE INDEX IF NOT EXISTS idx_bridge_routes_networks ON bridge_routes(from_network, to_network);
EOSQL

# Initialize Node Service database
psql -v ON_ERROR_STOP=1 --username "node" --dbname "node_service" <<-EOSQL
    -- Node Service tables
    CREATE TABLE IF NOT EXISTS nodes (
        id SERIAL PRIMARY KEY,
        node_id VARCHAR(66) NOT NULL UNIQUE,
        name VARCHAR(100) NOT NULL,
        node_type VARCHAR(20) NOT NULL,
        network_id VARCHAR(50) NOT NULL,
        rpc_url TEXT,
        p2p_url TEXT,
        status VARCHAR(20) NOT NULL DEFAULT 'offline',
        last_seen TIMESTAMP,
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS node_metrics (
        id SERIAL PRIMARY KEY,
        node_id VARCHAR(66) NOT NULL,
        cpu_usage DECIMAL(5,2) NOT NULL,
        memory_usage DECIMAL(5,2) NOT NULL,
        disk_usage DECIMAL(5,2) NOT NULL,
        network_usage BIGINT NOT NULL,
        block_height BIGINT NOT NULL,
        peer_count INTEGER NOT NULL,
        timestamp TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS node_events (
        id SERIAL PRIMARY KEY,
        node_id VARCHAR(66) NOT NULL,
        event_type VARCHAR(50) NOT NULL,
        event_data JSONB NOT NULL DEFAULT '{}',
        severity VARCHAR(20) NOT NULL DEFAULT 'info',
        timestamp TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS node_alerts (
        id SERIAL PRIMARY KEY,
        node_id VARCHAR(66) NOT NULL,
        alert_type VARCHAR(50) NOT NULL,
        severity VARCHAR(20) NOT NULL,
        message TEXT NOT NULL,
        status VARCHAR(20) NOT NULL DEFAULT 'active',
        acknowledged_by VARCHAR(42),
        acknowledged_at TIMESTAMP,
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    -- Indexes
    CREATE INDEX IF NOT EXISTS idx_nodes_id ON nodes(node_id);
    CREATE INDEX IF NOT EXISTS idx_nodes_type ON nodes(node_type);
    CREATE INDEX IF NOT EXISTS idx_nodes_status ON nodes(status);
    CREATE INDEX IF NOT EXISTS idx_node_metrics_node ON node_metrics(node_id);
    CREATE INDEX IF NOT EXISTS idx_node_metrics_timestamp ON node_metrics(timestamp);
    CREATE INDEX IF NOT EXISTS idx_node_events_node ON node_events(node_id);
    CREATE INDEX IF NOT EXISTS idx_node_events_type ON node_events(event_type);
    CREATE INDEX IF NOT EXISTS idx_node_events_timestamp ON node_events(timestamp);
    CREATE INDEX IF NOT EXISTS idx_node_alerts_node ON node_alerts(node_id);
    CREATE INDEX IF NOT EXISTS idx_node_alerts_status ON node_alerts(status);
    CREATE INDEX IF NOT EXISTS idx_node_alerts_severity ON node_alerts(severity);
EOSQL

echo "Database initialization completed successfully!"










