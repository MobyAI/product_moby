import { Metadata } from "next";
import TrackerClient from "./TrackerClient";

export const metadata: Metadata = {
  title: "Audition Tracker - tableread",
  description: "Track and manage your audition history",
};

export default function TrackerPage() {
  return <TrackerClient />;
}
