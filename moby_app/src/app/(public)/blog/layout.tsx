import BlogNavBar from "./BlogNavBar";

export default function BlogLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <BlogNavBar />
      {children}
    </>
  );
}