#!/usr/bin/env python3
import argparse
import stun as pystun3

def main():
    parser = argparse.ArgumentParser(description="Simple STUN CLI")
    parser.add_argument(
        "--server",
        type=str,
        default="stun.l.google.com",
        help="STUN server hostname (default: stun.l.google.com)"
    )
    parser.add_argument(
        "--port",
        type=int,
        default=19302,
        help="STUN server port (default: 19302)"
    )
    args = parser.parse_args()

    nat_type, external_ip, external_port = pystun3.get_ip_info(stun_host=args.server, stun_port=args.port)
    print(f"Public IP: {external_ip}")
    print(f"Public Port: {external_port}")
    print(f"NAT Type: {nat_type}")

if __name__ == "__main__":
    main()
