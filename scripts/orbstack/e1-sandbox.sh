#!/bin/sh
set -eu

MACHINE=e1-agent-sandbox
SCRIPT_DIR=$(CDPATH= cd "$(dirname "$0")" && pwd)
GUEST_SCRIPT=$SCRIPT_DIR/guest/e1-sandbox-guest.sh
action=${1:-}
created=0
stop_on_failure=0

fail() {
  printf '%s\n' "$*" >&2
  exit 1
}

cleanup() {
  status=$?
  trap - 0
  if [ "$status" -ne 0 ] && { [ "$created" -eq 1 ] || [ "$stop_on_failure" -eq 1 ]; }; then
    orb stop "$MACHINE" >/dev/null 2>&1 || true
    printf '%s\n' "Stopped $MACHINE after setup or isolation verification failed; inspect it before restarting." >&2
  fi
  exit "$status"
}

machine_exists() {
  machines=$(orb list --quiet) || return 1
  printf '%s\n' "$machines" | grep -Fxq "$MACHINE"
}

machine_running() {
  machines=$(orb list --running --quiet) || return 1
  printf '%s\n' "$machines" | grep -Fxq "$MACHINE"
}

check_config() {
  key=$1
  expected=$2
  value=$(orb config get "machine.$MACHINE.$key") || fail "Unable to read OrbStack config machine.$MACHINE.$key"
  [ "$value" = "$expected" ] || fail "OrbStack config machine.$MACHINE.$key must be $expected, got $value"
}

verify_orbstack_config() {
  check_config isolated true
  check_config isolate_network true
  check_config forward_ssh_agent false
  mounts=$(orb config get "machine.$MACHINE.mounts") || fail "Unable to read OrbStack mount config"
  [ -z "$mounts" ] || fail "OrbStack host mounts are configured: $mounts"
}

verify_machine() {
  verify_orbstack_config
  if ! machine_running; then
    orb start "$MACHINE"
  fi

  orb run -m "$MACHINE" -u e1setup sudo -n sh /usr/local/bin/e1-sandbox-guest start \
    || fail "Unable to reapply the egress guard before verification"
  guest_output=$(orb run -m "$MACHINE" -u e1setup sh -c 'sudo -n sh /usr/local/bin/e1-sandbox-guest verify') \
    || fail "Guest isolation verification failed: $guest_output"
  case "$guest_output" in
    *E1_EGRESS_GUARD_OK*) ;;
    *) fail "Guest did not confirm both egress blocks: $guest_output" ;;
  esac

  agent_output=$(orb run -m "$MACHINE" -u e1-agent /usr/local/bin/e1-sandbox-guest agent-check) \
    || fail "Agent privilege verification failed: $agent_output"
  case "$agent_output" in
    *E1_AGENT_PRIVILEGE_CHECK_OK*) ;;
    *) fail "e1-agent did not confirm its restricted privileges: $agent_output" ;;
  esac
  printf '%s\n' "E1 sandbox verified: IPv4/IPv6 egress blocked, no host mount or SSH agent, e1-agent has no privilege escalation."
}

if ! command -v orb >/dev/null 2>&1; then
  fail "OrbStack CLI 'orb' is required"
fi

case "$action" in
  prepare)
    if [ "${ALLOW_ORBSTACK_BOOTSTRAP_NETWORK:-}" != "1" ]; then
      fail "OrbStack bootstrap may download official Alpine packages. Set ALLOW_ORBSTACK_BOOTSTRAP_NETWORK=1 to approve setup-time downloads; no Agent is started."
    fi
    if machine_exists; then
      fail "Machine $MACHINE already exists; refusing to reuse or modify it."
    fi

    trap cleanup 0
    orb create --isolated --isolate-network --cpus 2 --memory 2G --disk 8G --user e1setup alpine:3.23 "$MACHINE"
    created=1

    # Apply both route blocks as the first guest operation after OrbStack bootstrap.
    orb run -m "$MACHINE" sudo -n sh -c 'set -eu; sysctl -w net.ipv6.conf.all.accept_ra=0 >/dev/null; sysctl -w net.ipv6.conf.default.accept_ra=0 >/dev/null; sysctl -w net.ipv6.conf.eth0.accept_ra=0 >/dev/null; while ip -4 rule del pref 1 type unreachable 2>/dev/null; do :; done; ip -4 rule add pref 1 type unreachable; while ip -6 rule del pref 1 type unreachable 2>/dev/null; do :; done; ip -6 rule add pref 1 type unreachable; while ip -4 route del default 2>/dev/null; do :; done; ip -4 route add unreachable default metric 1; while ip -6 route del default 2>/dev/null; do :; done; ip -6 route add unreachable default metric 1'
    orb push -m "$MACHINE" "$GUEST_SCRIPT" .
    orb run -m "$MACHINE" -u e1setup sh -c 'sudo -n sh "$HOME/e1-sandbox-guest.sh" install'
    orb stop "$MACHINE"
    orb start "$MACHINE"
    verify_machine
    orb stop "$MACHINE"
    created=0
    trap - 0
    ;;
  verify)
    if ! machine_exists; then
      fail "Machine $MACHINE does not exist; run prepare first."
    fi
    stop_on_failure=1
    trap cleanup 0
    verify_machine
    stop_on_failure=0
    trap - 0
    ;;
  *)
    fail "Usage: e1-sandbox.sh {prepare|verify}"
    ;;
esac
