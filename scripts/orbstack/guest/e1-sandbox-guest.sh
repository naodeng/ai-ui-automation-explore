#!/bin/sh
set -eu

fail() {
  printf '%s\n' "$*" >&2
  exit 1
}

apply_egress_guard() {
  sysctl -w net.ipv6.conf.all.accept_ra=0 >/dev/null
  sysctl -w net.ipv6.conf.default.accept_ra=0 >/dev/null
  sysctl -w net.ipv6.conf.eth0.accept_ra=0 >/dev/null
  while ip -4 rule del pref 1 type unreachable 2>/dev/null; do :; done
  ip -4 rule add pref 1 type unreachable
  while ip -6 rule del pref 1 type unreachable 2>/dev/null; do :; done
  ip -6 rule add pref 1 type unreachable
  while ip -4 route del default 2>/dev/null; do :; done
  ip -4 route add unreachable default metric 1
  while ip -6 route del default 2>/dev/null; do :; done
  ip -6 route add unreachable default metric 1
}

check_family() {
  family=$1
  target=$2
  route=$(ip "$family" route show default) || fail "Unable to inspect IPv$family default route"
  printf '%s\n' "$route" | awk '
    NF < 2 || $1 != "unreachable" || $2 != "default" { bad = 1 }
    {
      lines++
      for (i = 3; i < NF; i++) if ($i == "metric" && $(i + 1) == "1") metric = 1
    }
    END { if (bad || lines != 1 || !metric) exit 1 }
  ' || fail "IPv$family default route is not blocked: $route"
  if ip "$family" route get "$target" >/dev/null 2>&1; then
    fail "IPv$family still has a route to $target"
  fi
}

check_policy_rule() {
  family=$1
  rules=$(ip "$family" rule show) || fail "Unable to inspect IPv$family policy rules"
  printf '%s\n' "$rules" | awk '$1 == "1:" && $NF == "unreachable" { found = 1 } END { exit !found }' \
    || fail "IPv$family unreachable policy rule is missing"
}

verify_isolation() {
  rc-update show boot | awk '$1 == "sysctl" && $3 == "boot" { found = 1 } END { exit !found }' \
    || fail "Persistent sysctl service is not enabled at boot"
  for setting in all default eth0; do
    value=$(sysctl -n "net.ipv6.conf.$setting.accept_ra") || fail "Unable to inspect IPv6 Router Advertisement setting"
    [ "$value" = "0" ] || fail "IPv6 Router Advertisements are enabled on $setting"
  done
  check_policy_rule -4
  check_policy_rule -6
  check_family -4 203.0.113.1
  check_family -6 2001:db8::1
  id e1-agent >/dev/null 2>&1 || fail "e1-agent user is missing"
  if id -Gn e1-agent | tr ' ' '\n' | grep -qx wheel; then
    fail "e1-agent must not belong to wheel"
  fi
  root_hash=$(awk -F: '$1 == "root" { print $2 }' /etc/shadow)
  case "$root_hash" in
    '!'*) ;;
    *) fail "root password is not locked" ;;
  esac
  [ ! -e /mnt/mac ] || fail "Mac filesystem integration is present"
}

check_agent_privileges() {
  [ "$(id -un)" = "e1-agent" ] || fail "Agent privilege check must run as e1-agent"
  [ -z "${SSH_AUTH_SOCK:-}" ] || fail "SSH agent forwarding is present"
  awk '
    /^CapEff:/ || /^CapPrm:/ {
      if ($2 != "0000000000000000") exit 1
      found++
    }
    END { if (found != 2) exit 1 }
  ' /proc/self/status || fail "e1-agent has Linux capabilities"
  if command -v sudo >/dev/null 2>&1 && sudo -n true >/dev/null 2>&1; then
    fail "e1-agent can use sudo"
  fi
  if su root -c true >/dev/null 2>&1; then
    fail "e1-agent can switch to root"
  fi
  printf '%s\n' "E1_AGENT_PRIVILEGE_CHECK_OK"
}

install_sandbox() {
  [ "$(id -u)" = "0" ] || fail "install requires root"
  id e1-agent >/dev/null 2>&1 && fail "e1-agent already exists"
  adduser -D -s /bin/sh e1-agent
  if id -Gn e1-agent | tr ' ' '\n' | grep -qx wheel; then
    delgroup e1-agent wheel
  fi
  passwd -l root
  mkdir -p /etc/sysctl.d
  cat > /etc/sysctl.d/99-e1-egress.conf <<'EOF'

# E1 isolated sandbox: prevent late IPv6 Router Advertisements from restoring a route.
net.ipv6.conf.all.accept_ra = 0
net.ipv6.conf.default.accept_ra = 0
net.ipv6.conf.eth0.accept_ra = 0
EOF

  mkdir -p /etc/local.d /usr/local/bin
  cp "$0" /usr/local/bin/e1-sandbox-guest
  chmod 0755 /usr/local/bin/e1-sandbox-guest
  cp "$0" /etc/local.d/e1-egress-guard.start
  chmod 0755 /etc/local.d/e1-egress-guard.start
  rc-update add sysctl boot
  rc-update add local default
  /etc/local.d/e1-egress-guard.start
}

case "${1:-start}" in
  install)
    install_sandbox
    ;;
  verify)
    verify_isolation
    printf '%s\n' "E1_EGRESS_GUARD_OK ipv4=blocked ipv6=blocked root=locked host_mount=absent"
    ;;
  agent-check)
    check_agent_privileges
    ;;
  start)
    apply_egress_guard
    ;;
  *)
    fail "Usage: e1-sandbox-guest.sh {install|verify|agent-check|start}"
    ;;
esac
