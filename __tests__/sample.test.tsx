import { render, screen } from "@testing-library/react";

describe("Sample Test Suite", () => {
  it("renders a simple component without crashing", () => {
    render(<div>Hello ERP</div>);
    const element = screen.getByText("Hello ERP");
    expect(element).toBeInTheDocument();
  });
});
