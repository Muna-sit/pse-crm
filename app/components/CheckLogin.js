"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import supabase from "@/lib/supabase";
import Icon, { Avatar } from "./Icon";

// if not logged in, go to login page
// if logged in, show the menu + page
export default function CheckLogin({ children }) {
  const router = useRouter();
  const [user, setUser] = useState(null);

  useEffect(() => {
    async function check() {
      const { data } = await supabase.auth.getSession();

      if (!data.session) {
        router.push("/login");
        return;
      }

      const { data: profile } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", data.session.user.id)
        .single();

      setUser(profile || { name: data.session.user.email, role: "member" });
    }
    check();
  }, []);

  if (!user) {
    return <p style={{ padding: 20 }}>Loading...</p>;
  }

  return (
    <div className="page">
      <Menu user={user} />
      <div className="content">{children}</div>
    </div>
  );
}


// left side menu
const links = [
  { href: "/", name: "Dashboard", icon: "dashboard" },
  { href: "/contacts", name: "Contacts", icon: "contacts" },
  { href: "/deals", name: "Deals", icon: "deals" },
  { href: "/meetings", name: "Meetings", icon: "meetings" },
  { href: "/activities", name: "Activities", icon: "activities" },
  { href: "/targets", name: "Targets", icon: "targets" },
];

function Menu({ user }) {
  const router = useRouter();
  const path = usePathname();

  async function logout() {
    await supabase.auth.signOut();
    router.push("/login");
  }

  return (
    <div className="menu">
      <div className="logo">
        <span className="logo-box">PSE</span>
        <div>
          <b>PSE CRM</b>
          <small>JAAGO Foundation</small>
        </div>
      </div>

      <div className="menu-title">Menu</div>
      {links.map((l) => (
        <Link key={l.href} href={l.href} className={path === l.href ? "active" : ""}>
          <Icon name={l.icon} />
          {l.name}
        </Link>
      ))}

      <div className="menu-user">
        <Avatar name={user.name} />
        <div className="menu-user-name">
          {user.name}
          <small>{user.role}</small>
        </div>
        <button className="icon-btn" onClick={logout} title="Logout">
          <Icon name="logout" />
        </button>
      </div>
    </div>
  );
}
