#!/usr/bin/env python3
"""
Council v3 Routing Execution Layer
===================================
Routes tasks to appropriate models based on council v3 policy.

Usage:
  python3 scripts/council_v3_route.py --role supervisor --task "Analyze architecture"
  python3 scripts/council_v3_route.py --role critic --task "Challenge this verdict"
  python3 scripts/council_v3_route.py --role worker --task "Implement error logging"
  python3 scripts/council_v3_route.py --mission-type macro --task "Phase transition"
  python3 scripts/council_v3_route.py --verify  # Test routing

Reads from ~/.hermes/config.yaml council section.
"""

import yaml
import json
import sys
import os
import subprocess
from pathlib import Path

HERMES_HOME = Path.home() / '.hermes'
CONFIG_PATH = HERMES_HOME / 'config.yaml'

# Council v3 Role → Model Mapping
ROLE_MAP = {
    'supervisor': 'council.supervisor.model',
    'ux_compression': 'council.agents.ux_compression.model',
    'intelligence_optimizer': 'council.agents.intelligence_optimizer.model',
    'telemetry_measurement': 'council.agents.telemetry_measurement.model',
    'resilience_verifier': 'council.agents.resilience_verifier.model',
    'critic': 'council.agents.resilience_verifier.model',  # alias
    'second_opinion': 'council.escalation.second_opinion.model',
    'escalation_review': 'council.escalation.escalation_review.model',
}

# Mission Type → Routing Policy
MISSION_ROUTING = {
    'macro': {
        'sequence': ['supervisor', 'worker', 'critic', 'supervisor'],
        'description': 'v4-pro supervisor → flash workers → mimo critic → v4-pro verdict'
    },
    'micro': {
        'sequence': ['worker', 'escalation_review'],
        'description': 'flash primary → escalate v4-pro if uncertain'
    },
    'stewardship': {
        'sequence': ['worker', 'critic'],
        'description': 'flash primary → mimo anomaly review'
    },
    'hybrid': {
        'sequence': ['supervisor', 'worker', 'critic'],
        'description': 'macro discovery → micro execution → verify'
    }
}

def load_config():
    """Load hermes config.yaml"""
    with open(CONFIG_PATH, 'r') as f:
        return yaml.safe_load(f)

def get_model_for_role(config, role):
    """Get the model for a specific council role"""
    path = ROLE_MAP.get(role)
    if not path:
        return None
    
    parts = path.split('.')
    obj = config
    for part in parts:
        if isinstance(obj, dict) and part in obj:
            obj = obj[part]
        else:
            return None
    return obj

def get_routing_for_mission(mission_type):
    """Get the routing sequence for a mission type"""
    return MISSION_ROUTING.get(mission_type, MISSION_ROUTING['hybrid'])

def build_delegation_command(role, task, config):
    """Build the hermes command for a specific role"""
    model = get_model_for_role(config, role)
    provider = None
    
    # Get provider from config
    path = ROLE_MAP.get(role, '')
    parts = path.split('.')
    obj = config
    for part in parts[:-1]:  # Go to parent
        if isinstance(obj, dict) and part in obj:
            obj = obj[part]
    if isinstance(obj, dict):
        provider = obj.get('provider', 'openrouter')
    
    if not model:
        return None
    
    # Build command
    cmd = f'hermes chat -q {json.dumps(task)} -m {model}'
    if provider:
        cmd += f' --provider {provider}'
    
    return cmd

def verify_routing(config):
    """Verify all council v3 routing is configured"""
    print("=== Council v3 Routing Verification ===\n")
    
    all_ok = True
    
    # Check each role
    for role, path in ROLE_MAP.items():
        model = get_model_for_role(config, role)
        status = "✅" if model else "❌"
        if not model:
            all_ok = False
        print(f"  {status} {role}: {model or 'NOT CONFIGURED'}")
    
    # Check delegation config
    delegation = config.get('delegation', {})
    print(f"\n  Delegation model: {delegation.get('model', 'NOT SET')}")
    print(f"  Delegation provider: {delegation.get('provider', 'NOT SET')}")
    
    # Check mission routing
    print(f"\n  Mission routing:")
    for mission, policy in MISSION_ROUTING.items():
        print(f"    {mission}: {' → '.join(policy['sequence'])}")
    
    # Check smart model routing
    smr = config.get('smart_model_routing', {})
    print(f"\n  Smart model routing: {'enabled' if smr.get('enabled') else 'disabled'}")
    
    return all_ok

def main():
    import argparse
    parser = argparse.ArgumentParser(description='Council v3 Routing Execution Layer')
    parser.add_argument('--role', choices=list(ROLE_MAP.keys()), help='Agent role')
    parser.add_argument('--task', help='Task to execute')
    parser.add_argument('--mission-type', choices=list(MISSION_ROUTING.keys()), help='Mission type')
    parser.add_argument('--verify', action='store_true', help='Verify routing configuration')
    parser.add_argument('--dry-run', action='store_true', help='Print command without executing')
    args = parser.parse_args()
    
    config = load_config()
    
    if args.verify:
        ok = verify_routing(config)
        sys.exit(0 if ok else 1)
    
    if args.role and args.task:
        cmd = build_delegation_command(args.role, args.task, config)
        if cmd:
            if args.dry_run:
                print(f"[DRY RUN] {cmd}")
            else:
                print(f"[EXECUTE] {cmd}")
                # Don't actually execute — return the command for the supervisor to use
        else:
            print(f"[ERROR] No model configured for role: {args.role}")
            sys.exit(1)
    
    elif args.mission_type:
        policy = get_routing_for_mission(args.mission_type)
        print(f"Mission type: {args.mission_type}")
        print(f"Routing: {policy['description']}")
        print(f"Sequence: {' → '.join(policy['sequence'])}")
        
        for role in policy['sequence']:
            model = get_model_for_role(config, role)
            print(f"  {role}: {model}")
    
    else:
        parser.print_help()

if __name__ == '__main__':
    main()
